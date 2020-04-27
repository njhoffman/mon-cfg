#!/bin/bash

if [[ "$1" == "init" ]]; then
  xrandr_out=`node "$HOME/bin/mon-config/lib/index.js" xrandr`
  env_out=`node "$HOME/bin/mon-config/lib/index.js" env`
  export MON_CFG="$env_out"
elif [[ "$1" == "notify" ]]; then
  notify_out=`node "$HOME/bin/mon-config/lib/index.js" notify`
else
  display_out=`node "$HOME/bin/mon-config/lib/index.js"`
  echo "$display_out"
fi
