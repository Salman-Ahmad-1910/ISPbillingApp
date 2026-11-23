#!/usr/bin/env bash
# =============================================================================
#  FinTrack ERP - deployment menu (test server)
# =============================================================================
#  Same menu as the production deployer:
#    1) Backups      - back up / list / restore the database (+ uploads)
#    2) Deployment   - fetch repo & reset commit, build, full deployment
#    3) Status       - commit, app process, health, backups, disk
#    4) Exit & Logout
#
#  Usage (on the server):
#    chmod +x fintrack-deploy.sh
#    ./fintrack-deploy.sh
#
#  It never touches .env, uploads/ or certs/ (they are not part of git).
# =============================================================================

set -uo pipefail

# ----------------------------- settings --------------------------------------
# Change these to match the test server. Every value can also be given as an
# environment variable, e.g.  APP_DIR=/srv/fintrack ./fintrack-deploy.sh
APP_DIR="${APP_DIR:-$HOME/ISPbillingApp}"              # folder holding the git clone
REPO_URL="${REPO_URL:-https://github.com/Salman-Ahmad-1910/ISPbillingApp.git}"
BRANCH="${BRANCH:-main}"
BINARY_NAME="${BINARY_NAME:-fintrack-erp}"              # produced by ./build.sh
SERVICE_NAME="${SERVICE_NAME:-}"                        # systemd unit; empty = detect
BACKUP_DIR="${BACKUP_DIR:-$HOME/fintrack-backups}"
KEEP_BACKUPS="${KEEP_BACKUPS:-15}"                      # newest N backups are kept
LOG_FILE="${LOG_FILE:-$APP_DIR/logs/$BINARY_NAME.log}"  # used when not run by systemd
# -----------------------------------------------------------------------------

BIN_PATH="$APP_DIR/$BINARY_NAME"
PID_FILE="$APP_DIR/$BINARY_NAME.pid"

# ------------------------------ helpers --------------------------------------
c_red=$'\e[31m'; c_grn=$'\e[32m'; c_ylw=$'\e[33m'; c_cyn=$'\e[36m'; c_off=$'\e[0m'
info()  { echo "${c_cyn}>>${c_off} $*"; }
ok()    { echo "${c_grn}OK${c_off} $*"; }
warn()  { echo "${c_ylw}!!${c_off} $*"; }
fail()  { echo "${c_red}ERROR${c_off} $*"; }
line()  { echo "============================================"; }
# Every prompt goes through ask(): if the terminal is gone (SSH dropped, end of
# input) the script exits instead of looping on empty answers.
ask() { local __var="$1"; shift; if ! IFS= read -r -p "$*" "${__var?}"; then echo; echo "Input closed - exiting."; exit 0; fi; }
pause() { echo; local _p; ask _p "Press Enter to continue..."; }
confirm() { local a; ask a "$1 [y/N]: "; [[ "$a" =~ ^[Yy]$ ]]; }

as_root() { if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo "$@"; fi; }

# Read KEY from the app's .env file (quotes stripped). Empty if missing.
env_value() {
  local key="$1" file="$APP_DIR/.env" v
  [ -f "$file" ] || { echo ""; return; }
  v="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$file" | tail -n1 | cut -d= -f2-)"
  v="${v%$'\r'}"
  v="$(echo "$v" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")"
  echo "$v"
}

db_name()  { local v; v="$(env_value DB_NAME)"; echo "${v:-unknown}"; }
app_port() { local v; v="$(env_value PORT)"; echo "${v:-8090}"; }

pg_env() {
  export PGHOST PGPORT PGUSER PGPASSWORD
  PGHOST="$(env_value DB_HOST)";  PGHOST="${PGHOST:-localhost}"
  PGPORT="$(env_value DB_PORT)";  PGPORT="${PGPORT:-5432}"
  PGUSER="$(env_value DB_USER)";  PGUSER="${PGUSER:-postgres}"
  PGPASSWORD="$(env_value DB_PASSWORD)"
}

need_repo() {
  if [ ! -d "$APP_DIR/.git" ]; then
    fail "No git repository at $APP_DIR."
    echo "   Set APP_DIR at the top of this script to the folder where the app is deployed."
    return 1
  fi
}

# ------------------------- finding the running app ---------------------------
# PIDs of the running app: processes named BINARY_NAME, plus whatever listens
# on the app port, as long as it is that binary.
app_pids() {
  local pids="" port pid
  pids="$(pgrep -x "$BINARY_NAME" 2>/dev/null || true)"
  port="$(app_port)"
  if command -v ss >/dev/null 2>&1; then
    for pid in $(ss -ltnpH "sport = :$port" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2); do
      pids="$pids $pid"
    done
  elif command -v lsof >/dev/null 2>&1; then
    pids="$pids $(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  fi
  for pid in $pids; do
    [ -r "/proc/$pid/comm" ] && [ "$(cat "/proc/$pid/comm")" = "$BINARY_NAME" ] && echo "$pid"
  done | sort -u
}

# Name of the systemd service that runs the app, if any.
detect_service() {
  if [ -n "$SERVICE_NAME" ]; then echo "$SERVICE_NAME"; return; fi
  local pid unit
  for pid in $(app_pids); do
    unit="$(grep -o '[^/]*\.service' "/proc/$pid/cgroup" 2>/dev/null | head -n1)"
    if [ -n "$unit" ] && [[ "$unit" != user@*.service ]] && [[ "$unit" != session-*.scope ]]; then
      echo "$unit"; return
    fi
  done
  if command -v systemctl >/dev/null 2>&1; then
    unit="$(systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk '{print $1}' | grep -i -E 'fintrack|ispbilling|wasooli' | head -n1)"
    [ -n "$unit" ] && echo "$unit"
  fi
}

health_check() {
  local port url code
  port="$(app_port)"
  for url in "https://127.0.0.1:$port/health" "http://127.0.0.1:$port/health"; do
    code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || true)"
    if [ "$code" = "200" ]; then echo "$url"; return 0; fi
  done
  return 1
}

wait_healthy() {
  local url
  for _ in $(seq 1 30); do
    if url="$(health_check)"; then ok "App is up: $url"; return 0; fi
    sleep 1
  done
  fail "App did not answer /health within 30 seconds."
  return 1
}

stop_app() {
  local service pids pid
  service="$(detect_service)"
  if [ -n "$service" ]; then
    info "Stopping service $service ..."
    as_root systemctl stop "$service"
    return
  fi
  pids="$(app_pids)"
  [ -z "$pids" ] && { info "App is not running."; return; }
  info "Stopping app (PID $(echo "$pids" | tr '\n' ' '))..."
  for pid in $pids; do kill "$pid" 2>/dev/null || as_root kill "$pid" 2>/dev/null || true; done
  for _ in $(seq 1 15); do
    [ -z "$(app_pids)" ] && { ok "Stopped."; rm -f "$PID_FILE"; return; }
    sleep 1
  done
  warn "App did not stop in 15 seconds, forcing it."
  for pid in $(app_pids); do kill -9 "$pid" 2>/dev/null || as_root kill -9 "$pid" 2>/dev/null || true; done
  rm -f "$PID_FILE"
}

start_app() {
  local service
  service="$(detect_service)"
  if [ -n "$service" ]; then
    info "Starting service $service ..."
    as_root systemctl start "$service"
  else
    [ -x "$BIN_PATH" ] || { fail "$BIN_PATH not found. Build first."; return 1; }
    if [ -n "$(app_pids)" ]; then warn "App is already running."; return 0; fi
    mkdir -p "$(dirname "$LOG_FILE")"
    info "Starting $BINARY_NAME in the background (log: $LOG_FILE) ..."
    # setsid + nohup: keeps running after you log out of the server. The whole
    # subshell is redirected and replaced (exec) by the app, so nothing stays
    # attached to this terminal.
    ( cd "$APP_DIR" && exec setsid nohup "./$BINARY_NAME" ) >> "$LOG_FILE" 2>&1 < /dev/null &
    echo $! > "$PID_FILE"
  fi
  wait_healthy
}

restart_app() {
  local service
  service="$(detect_service)"
  if [ -n "$service" ]; then
    info "Restarting service $service ..."
    as_root systemctl restart "$service"
    wait_healthy
  else
    stop_app
    start_app
  fi
}

# -------------------------------- backups ------------------------------------
backup_now() {
  need_repo || return 1
  local db stamp file
  db="$(db_name)"
  [ "$db" = "unknown" ] && { fail "DB_NAME is not set in $APP_DIR/.env"; return 1; }
  command -v pg_dump >/dev/null 2>&1 || { fail "pg_dump is not installed."; return 1; }
  mkdir -p "$BACKUP_DIR"
  stamp="$(date +%Y-%m-%d_%H-%M-%S)"
  file="$BACKUP_DIR/${db}_${stamp}.dump"
  pg_env
  info "Backing up database '$db' ..."
  if pg_dump -Fc -f "$file" "$db"; then
    ok "Database backup: $file ($(du -h "$file" | cut -f1))"
  else
    fail "Database backup failed."; rm -f "$file"; return 1
  fi
  if [ -d "$APP_DIR/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_${stamp}.tar.gz" -C "$APP_DIR" uploads 2>/dev/null \
      && ok "Uploads backup: $BACKUP_DIR/uploads_${stamp}.tar.gz"
  fi
  prune_backups
}

prune_backups() {
  local f
  for pattern in "*.dump" "uploads_*.tar.gz"; do
    # shellcheck disable=SC2012
    ls -1t "$BACKUP_DIR"/$pattern 2>/dev/null | tail -n +"$((KEEP_BACKUPS + 1))" | while read -r f; do
      rm -f "$f" && info "Removed old backup $(basename "$f")"
    done
  done
}

list_backups() {
  mkdir -p "$BACKUP_DIR"
  echo "Backups in $BACKUP_DIR (newest first):"
  # shellcheck disable=SC2012
  ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | nl -w2 -s') ' | while read -r n f; do
    echo "$n $(basename "$f")  ($(du -h "$f" | cut -f1))"
  done
  ls "$BACKUP_DIR"/*.dump >/dev/null 2>&1 || echo "   (none yet)"
}

restore_backup() {
  need_repo || return 1
  local db files choice file typed
  db="$(db_name)"
  # shellcheck disable=SC2012
  mapfile -t files < <(ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null)
  [ "${#files[@]}" -eq 0 ] && { warn "No backups found."; return; }
  list_backups
  ask choice "Number of the backup to restore (Enter = cancel): "
  [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#files[@]}" ] || { info "Cancelled."; return; }
  file="${files[$((choice - 1))]}"
  echo
  warn "This REPLACES all data in database '$db' with $(basename "$file")."
  ask typed "Type the database name ($db) to continue: "
  [ "$typed" = "$db" ] || { info "Cancelled."; return; }
  info "Taking a safety backup of the current data first ..."
  backup_now || { fail "Safety backup failed, restore cancelled."; return 1; }
  stop_app
  pg_env
  info "Restoring ..."
  if pg_restore --clean --if-exists --no-owner -d "$db" "$file"; then
    ok "Restore finished."
  else
    warn "pg_restore reported warnings/errors (often harmless). Check the app."
  fi
  start_app
}

backups_menu() {
  local o=""
  while true; do
    clear; line; echo "              BACKUPS MENU"; line
    echo "1) Backup now (database + uploads)"
    echo "2) List backups"
    echo "3) Restore a backup"
    echo "4) Back"
    line
    ask o "Select an option [1-4]: "
    case "$o" in
      1) backup_now; pause ;;
      2) list_backups; pause ;;
      3) restore_backup; pause ;;
      4) return ;;
      *) warn "Invalid option"; sleep 1 ;;
    esac
  done
}

# ------------------------------- deployment ----------------------------------
fetch_and_reset() {
  if [ ! -d "$APP_DIR/.git" ]; then
    warn "No repository at $APP_DIR."
    confirm "Clone $REPO_URL into $APP_DIR?" || return 1
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR" || { fail "Clone failed."; return 1; }
  fi
  cd "$APP_DIR" || return 1
  local target=""
  info "Fetching from GitHub ..."
  git fetch --prune origin || { fail "git fetch failed (network or credentials)."; return 1; }
  echo
  echo "Current : $(git log -1 --format='%h  %ad  %s' --date=format:'%d-%m-%Y %H:%M')"
  echo "Latest  : $(git log -1 --format='%h  %ad  %s' --date=format:'%d-%m-%Y %H:%M' "origin/$BRANCH")"
  echo
  echo "Recent commits on origin/$BRANCH:"
  git log --format='   %h  %ad  %s' --date=format:'%d-%m-%Y' -10 "origin/$BRANCH"
  echo
  ask target "Commit to deploy (Enter = latest origin/$BRANCH): "
  target="${target:-origin/$BRANCH}"
  git rev-parse --verify --quiet "$target^{commit}" >/dev/null || { fail "Unknown commit: $target"; return 1; }
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    warn "These files were changed on the server and will be reset:"
    git status --short --untracked-files=no
    confirm "Discard those changes?" || { info "Cancelled."; return 1; }
  fi
  git checkout -q "$BRANCH" 2>/dev/null || true
  git reset --hard "$target" || { fail "Reset failed."; return 1; }
  ok "Code is now at $(git log -1 --format='%h  %s')"
  # .env, uploads/ and certs/ are untracked and are left untouched.
}

build_app() {
  need_repo || return 1
  cd "$APP_DIR" || return 1
  [ -f .env ] || warn ".env is missing in $APP_DIR - the app will not connect to the database."
  if [ -x "$BIN_PATH" ]; then
    cp -f "$BIN_PATH" "$BIN_PATH.prev" && info "Previous build kept as $BINARY_NAME.prev (for rollback)."
  fi
  info "Building (./build.sh --prod) - this can take a few minutes ..."
  # The running app keeps working during the build; it is only restarted after
  # a successful build.
  if bash ./build.sh --prod; then
    ok "Build complete."
  else
    fail "Build failed. The app still runs the previous version."
    return 1
  fi
}

full_deployment() {
  need_repo || return 1
  line; echo " FULL DEPLOYMENT: backup > fetch & reset > build > restart"; line
  backup_now || { confirm "Backup failed. Continue without a backup?" || return 1; }
  fetch_and_reset || return 1
  build_app || return 1
  restart_app || {
    fail "The new version did not start."
    if [ -x "$BIN_PATH.prev" ] && confirm "Roll back to the previous build?"; then rollback_build; fi
    return 1
  }
  ok "Deployed $(cd "$APP_DIR" && git log -1 --format='%h  %s')"
}

rollback_build() {
  [ -x "$BIN_PATH.prev" ] || { fail "No previous build to roll back to."; return 1; }
  stop_app
  cp -f "$BIN_PATH.prev" "$BIN_PATH"
  ok "Previous build restored."
  start_app
}

deployment_menu() {
  local o=""
  while true; do
    clear; line; echo "            DEPLOYMENT MENU"; line
    echo "1) Fetch Repo & Reset Commit"
    echo "2) Build Application (./build.sh --prod)"
    echo "3) Full Deployment"
    echo "4) Back"
    echo "5) Restart App"
    echo "6) Roll Back to Previous Build"
    line
    ask o "Select an option [1-6]: "
    case "$o" in
      1) fetch_and_reset; pause ;;
      2) build_app && confirm "Restart the app now to run the new build?" && restart_app; pause ;;
      3) full_deployment; pause ;;
      4) return ;;
      5) restart_app; pause ;;
      6) confirm "Run the previous build again?" && rollback_build; pause ;;
      *) warn "Invalid option"; sleep 1 ;;
    esac
  done
}

# --------------------------------- status ------------------------------------
show_status() {
  clear; line; echo "                 STATUS"; line
  echo "App folder : $APP_DIR"
  echo "Database   : $(db_name)    Port: $(app_port)"
  if [ -d "$APP_DIR/.git" ]; then
    echo "Commit     : $(cd "$APP_DIR" && git log -1 --format='%h  %ad  %s' --date=format:'%d-%m-%Y %H:%M')"
  fi
  local service pids url
  service="$(detect_service)"
  pids="$(app_pids | tr '\n' ' ')"
  if [ -n "$service" ]; then
    echo "Runs as    : systemd service $service ($(systemctl is-active "$service" 2>/dev/null))"
  else
    echo "Runs as    : background process"
  fi
  if [ -n "$pids" ]; then echo "Process    : running (PID $pids)"; else echo "Process    : ${c_red}not running${c_off}"; fi
  if url="$(health_check)"; then echo "Health     : ${c_grn}OK${c_off} ($url)"; else echo "Health     : ${c_red}no answer${c_off}"; fi
  # shellcheck disable=SC2012
  local last; last="$(ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | head -n1)"
  if [ -n "$last" ]; then echo "Last backup: $(basename "$last")"; else echo "Last backup: none"; fi
  echo "Disk free  : $(df -h "$APP_DIR" 2>/dev/null | awk 'NR==2{print $4" free of "$2}')"
  if [ -z "$service" ] && [ -f "$LOG_FILE" ]; then
    echo; echo "Last log lines ($LOG_FILE):"; tail -n 8 "$LOG_FILE"
  elif [ -n "$service" ]; then
    echo; echo "Last log lines (journalctl -u $service):"; as_root journalctl -u "$service" -n 8 --no-pager 2>/dev/null
  fi
}

# ---------------------------------- main -------------------------------------
main_menu() {
  local o=""
  while true; do
    clear; line; echo "       FINTRACK ERP DEPLOYMENT MENU"; line
    echo "Database: $(db_name)"
    line
    echo "1) Backups"
    echo "2) Deployment"
    echo "3) Status"
    echo "4) Exit & Logout"
    line
    ask o "Select an option [1-4]: "
    case "$o" in
      1) backups_menu ;;
      2) deployment_menu ;;
      3) show_status; pause ;;
      4) echo "Bye."; exit 0 ;;
      *) warn "Invalid option"; sleep 1 ;;
    esac
  done
}

main_menu
