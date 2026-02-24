#!/bin/bash
set -euo pipefail

. ./bin/utils.sh

./bin/deploy_sns_assets.sh "ic_test" "rubysparklabs" "build_prod"
