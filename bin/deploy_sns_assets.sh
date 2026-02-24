#!/bin/bash
set -euo pipefail

. ./bin/utils.sh

if [ $# -eq 0 ]
  then
    me=$(basename "$0")
    usage "Deploy SNS ASSETS canister." "$me <NETWORK> <IDENTITY> <NPM TASK>"
    exit 1
fi

NETWORK=$1
IDENTITY=$2
NPM_TASK=$3
header "Deploy SNS ASSETS canister to network \"$NETWORK\" with identity \"$IDENTITY\" and npm task \"$NPM_TASK\""
confirm "Do you want to proceed with the deployment?"

header "Building frontend with npm task: $NPM_TASK"
cd app
npm run $NPM_TASK
cd ..

header "Deploying SNS ASSETS canister to network: $NETWORK with identity: $IDENTITY"
dfx deploy --network $NETWORK --identity $IDENTITY sns_assets

header "SNS ASSETS canister deployed successfully!"