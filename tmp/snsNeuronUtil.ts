import {DissolveState, NervousSystemParameters, Neuron, NeuronId, NeuronPermission, NeuronPermissionList} from "@dfinity/sns/dist/candid/sns_governance";
import {hasOwnProperty, unionToArray} from "@geekfactory/core";
import {FormatDurationOptions} from "@geekfactory/core/dist/date/format";
import {fromNullable, isNullish} from "@dfinity/utils";
import {SnsNeuron, SnsNeuronPermissionType} from "@dfinity/sns";
import {SNSNeuronFollowersByFunction, SNSNeuronView} from "src/shared/data/SNSNeuronsViewProvider";
import _ from "lodash"

export const getNeuronId = (neuronId: Neuron["id"]): NeuronId["id"] | undefined => {
    return fromNullable(neuronId)?.id;
}

export type SNSNeuronDissolveStateType = "dissolving" | "notDissolving" | "dissolved"
export const allSNSNeuronDissolveStateTypes = unionToArray<SNSNeuronDissolveStateType>()(
    "notDissolving",
    "dissolving",
    "dissolved"
)

export type SNSNeuronDissolveState = {
    state: SNSNeuronDissolveStateType,
    seconds: bigint
}
export const getNeuronDissolveState = (state: DissolveState | undefined): SNSNeuronDissolveState | undefined => {
    if (state == undefined) {
        return undefined
    }
    if (hasOwnProperty(state, "WhenDissolvedTimestampSeconds")) {
        const milliseconds = Number(state.WhenDissolvedTimestampSeconds) * 1000;
        if (milliseconds < Date.now()) {
            return {
                state: "dissolved",
                seconds: 0n
            }
        }
        return {
            state: "dissolving",
            seconds: state.WhenDissolvedTimestampSeconds
        }
    } else if (hasOwnProperty(state, "DissolveDelaySeconds")) {
        const {DissolveDelaySeconds} = state;
        return {
            state: DissolveDelaySeconds == 0n ? "dissolved" : "notDissolving",
            seconds: DissolveDelaySeconds
        }
    }
}

export const getNeuronDissolveStateLabel = (state: SNSNeuronDissolveStateType | undefined): string | undefined => {
    if (state == undefined) {
        return undefined
    }
    switch (state) {
        case "dissolving": {
            return "Dissolving";
        }
        case "notDissolving": {
            return "Not Dissolving";
        }
        case "dissolved": {
            return "Dissolved";
        }
    }
}

export const getNeuronDissolveDelayMillis = (state: SNSNeuronDissolveState | undefined, options?: FormatDurationOptions): number | undefined => {
    if (state == undefined || state.state == "dissolved") {
        return undefined
    }
    const millis = Number(state.seconds) * 1000;
    switch (state.state) {
        case "dissolving": {
            return millis - Date.now()
        }
        case "notDissolving": {
            return millis
        }
    }
}

export const getNeuronAgeMillis = (state: SNSNeuronDissolveState | undefined, agingSinceTimestampSeconds: bigint): number | undefined => {
    if (state == undefined || state.state != "notDissolving") {
        return undefined
    }
    const millis = Number(agingSinceTimestampSeconds) * 1000;
    return Date.now() - millis
}

export const getVestingPeriodMillis = (value: Neuron["vesting_period_seconds"]): number | undefined => {
    const seconds = fromNullable(value);
    if (seconds == undefined) {
        return undefined
    }
    return Number(seconds) * 1000
}

export const getNeuronMinimumDissolveDelayToVoteMillis = (value: NervousSystemParameters["neuron_minimum_dissolve_delay_to_vote_seconds"]): number | undefined => {
    const seconds = fromNullable(value);
    if (seconds == undefined) {
        return undefined
    }
    return Number(seconds) * 1000
}

export const allSNSNeuronPermissionTypes: SnsNeuronPermissionType[] = Object.values(SnsNeuronPermissionType)
    .filter((value) => typeof value === "number") as SnsNeuronPermissionType[];

export const getSNSNeuronPermissionTypeLabel = (value: number): string | undefined => {
    switch (value as SnsNeuronPermissionType) {
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_UNSPECIFIED:
            return "Unspecified";
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_CONFIGURE_DISSOLVE_STATE:
            return "Configure Dissolve State";
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_MANAGE_PRINCIPALS:
            return "Manage Principals";
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_SUBMIT_PROPOSAL:
            return "Submit Proposal";
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_VOTE:
            return "Vote";
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_DISBURSE:
            return "Disburse";
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_SPLIT:
            return "Split";
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_MERGE_MATURITY:
            return "Merge Maturity";
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_DISBURSE_MATURITY:
            return "Disburse Maturity";
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_STAKE_MATURITY:
            return "Stake Maturity";
        case SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_MANAGE_VOTING_PERMISSION:
            return "Manage Voting Permission";
    }
}

export const getNeuronPermissions = (permissions: [] | [NeuronPermissionList] | undefined): NeuronPermissionList["permissions"] | undefined => {
    if (permissions == undefined) {
        return undefined
    }
    return fromNullable(permissions)?.permissions
}

export const hasPermissions = (neuron: Neuron, permissions: SnsNeuronPermissionType[]): boolean => {
    const neuronId = fromNullable(neuron.id);
    if (isNullish(neuronId)) {
        return false;
    }

    return neuron.permissions.every((neuronPermission: NeuronPermission) => {
        return permissions.every(permission => {
            return neuronPermission.permission_type.includes(permission);
        });
    })
};

export const hasAnyPermissionToVote = (neuron: SnsNeuron): boolean => hasPermissions(neuron, [SnsNeuronPermissionType.NEURON_PERMISSION_TYPE_VOTE]);

export const isDirectFollower = (neuronView: SNSNeuronView, neuronIdHex: string, functionId: bigint): boolean => {
    const item: SNSNeuronFollowersByFunction | undefined = _.find(neuronView.followers?.followers, (v, i) => v.nsFunctionId == functionId);
    // if (IS_DEBUG_ENABLED) {
    //     console.log(`isDirectFollower[functionId=${functionId}]`, item, {neuronIdHex, functionId, neuronView});
    // }
    if (item == undefined) {
        return false
    }
    return item.neuronViewsByNeuronIdHex[neuronIdHex] != undefined
}
