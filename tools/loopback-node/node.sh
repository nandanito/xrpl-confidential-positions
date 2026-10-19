#!/usr/bin/env bash
# W-CONF loopback ledger source — start | stop | status | wait | rpc
#
# CLAIMS.md B-15's step-7 ruling (2026-08-25): the facility's ledger reads go to
# LOOPBACK. This script is that node. It runs rippled 3.3.0 in Docker, syncing
# Devnet, with its RPC published on 127.0.0.1 ONLY.
#
# ⚠ "We ran a local node once" is not the property (REVIEW-019). The property is
# that every one of the facility's reads goes here. `tools/check-loopback.ts` is
# what enforces that; this script only provides the endpoint.
set -euo pipefail

IMAGE="xrpllabsofficial/xrpld:3.3.0"
NAME="wconf-devnet-node"
VOLUME="wconf-devnet-db"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA="${WCONF_NODE_DATA:-$HOME/.wconf/rippled-devnet}"
RPC="http://127.0.0.1:5005"

rpc() {
  local params="${2:-{}}"
  curl -s --max-time 10 -X POST "$RPC" -H 'Content-Type: application/json' \
    -d "{\"method\":\"$1\",\"params\":[$params]}"
}

case "${1:-status}" in
  start)
    # Data lives OUTSIDE /tmp deliberately: /tmp/wconf/state.json has now been
    # lost twice (CLAIMS.md E-97, E-133) and a resync is a cost with no upside.
    mkdir -p "$DATA/log"
    if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
      docker start "$NAME" >/dev/null
    else
      # ⚠ The ledger database is a NAMED DOCKER VOLUME, not a bind mount from
      # the host. NuDB writes many small records, and a macOS bind mount goes
      # through VirtioFS; the first attempt at this node used one and could not
      # keep up with Devnet's ~4s ledger close at all. That is a measurement,
      # not a preference — see facility/README.md.
      docker volume create "$VOLUME" >/dev/null
      docker run -d --name "$NAME" --platform linux/amd64 \
        -p 127.0.0.1:5005:5005 -p 127.0.0.1:6006:6006 \
        -v "$HERE:/config:ro" \
        -v "$VOLUME:/var/lib/rippled" \
        -v "$DATA/log:/var/log/rippled" \
        "$IMAGE" >/dev/null
    fi
    echo "started $NAME — $RPC"
    echo "⚠ It is NOT usable until it reports 'full'. Run: $0 wait"
    ;;
  stop)    docker stop "$NAME" >/dev/null && echo "stopped $NAME" ;;
  destroy) docker rm -f "$NAME" >/dev/null 2>&1 || true; echo "removed $NAME (ledger data kept in volume $VOLUME; docker volume rm $VOLUME to drop it)" ;;
  logs)    docker logs --tail "${2:-50}" "$NAME" ;;
  rpc)     rpc "$2" "${3:-{}}" ;;
  status)
    out=$(rpc server_info || true)
    if [ -z "$out" ]; then
      # ⚠ "unreachable" on its own is the same uninformative answer rippled
      # gives when its peer list does not connect ("Node count (0)"), and it
      # cost a session an hour of digging. Say WHY.
      state=$(docker inspect "$NAME" --format '{{.State.Status}}' 2>/dev/null || echo absent)
      case "$state" in
        absent)  echo "no container named $NAME — run: $0 start" ;;
        running) echo "unreachable at $RPC, but the container is running. It may still be"                       "starting; try again in a few seconds, then $0 logs" ;;
        *)
          oom=$(docker inspect "$NAME" --format '{{.State.OOMKilled}}' 2>/dev/null)
          code=$(docker inspect "$NAME" --format '{{.State.ExitCode}}' 2>/dev/null)
          echo "container $state, ExitCode=$code, OOMKilled=$oom"
          if [ "$oom" = "true" ]; then
            echo
            echo "⚠ The kernel killed it: the Docker VM ran out of memory. This is NOT a slow"
            echo "  sync — it is a ceiling, and leaving it longer will not help (CLAIMS.md E-148)."
            echo "  Levers, in order: raise Docker Desktop's memory; set [node_size] tiny in"
            echo "  $HERE/rippled.cfg; build rippled natively for arm64."
            echo "  ⚠ Swap is not a lever. A node that cannot keep up with a four-second ledger"
            echo "    close will not be rescued by paging."
            echo
            echo "  Docker VM memory now: $(docker info --format '{{.MemTotal}}' 2>/dev/null |
                    awk '{printf "%.1f GiB", $1/1073741824}')"
          fi
          echo "  restart with: $0 start   (the ledger data in volume $VOLUME is kept)"
          ;;
      esac
      exit 1
    fi
    printf '%s' "$out" | python3 -c '
import json,sys
i = json.load(sys.stdin).get("result",{}).get("info",{})
print("state           ", i.get("server_state"))
print("build           ", i.get("build_version"))
print("network_id      ", i.get("network_id"))
print("complete_ledgers", i.get("complete_ledgers"))
print("peers           ", i.get("peers"))
v = i.get("validated_ledger") or {}
print("validated       ", v.get("seq"), "age", i.get("validated_ledger",{}).get("age"))
'
    ;;
  wait)
    # A node that is "running" is not a node that can answer a pinned read.
    deadline=$(( $(date +%s) + ${2:-900} ))
    while [ "$(date +%s)" -lt "$deadline" ]; do
      st=$(rpc server_info | python3 -c 'import json,sys; print((json.load(sys.stdin).get("result",{}).get("info",{})).get("server_state","?"))' 2>/dev/null || echo unreachable)
      if [ "$st" = "full" ]; then echo "full"; exit 0; fi
      echo "  … $st"; sleep 10
    done
    echo "did NOT reach 'full' in time — this is a named gap, not a reason to use a remote endpoint"; exit 1
    ;;
  *) echo "usage: $0 {start|stop|destroy|status|wait|logs|rpc}"; exit 2 ;;
esac
