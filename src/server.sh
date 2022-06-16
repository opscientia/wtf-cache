#!/bin/bash

# Run a server that accomplishes two tasks.
# (1) Expose an API that provides read-access and (for authorized 
# users only) write-access to a cache of WTF user data.
# (2) Run an event-listener that automatically updates the cache
# when certain on-chain events occur.
# cache-server accomplishes (1), and cache-updater accomplishes (2).

shopt -s expand_aliases
alias run_cache_server='node ./src/cache-server.js'
alias run_cache_updater_v1='node ./src/api-v1/cache-updater.js'
alias run_cache_updater_v2='node ./src/api-v2/cache-updater.js'

run_cache_server & run_cache_updater_v1 & run_cache_updater_v2 && fg; fg; fg;

