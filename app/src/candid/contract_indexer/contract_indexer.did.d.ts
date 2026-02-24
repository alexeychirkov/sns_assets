import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AccountInformation {
  'balance' : [] | [Timestamped_2],
  'account_identifier' : Uint8Array | number[],
}
export interface AccountsInformation {
  'principal' : Principal,
  'main_account_information' : [] | [AccountInformation],
  'sub_accounts' : Array<SubAccountInformation>,
}
export interface BuyerOffer {
  'referral' : [] | [string],
  'offer_amount' : bigint,
  'buyer' : Principal,
  'approved_account' : LedgerAccount,
}
export type CancelSaleDealState = {
    'RefundBuyerFromTransitAccount' : { 'buyer' : Principal }
  } |
  { 'StartCancelSaleDeal' : { 'sale_deal_state' : SaleDealState } };
export interface CanisterCyclesState {
  'initial_cycles' : bigint,
  'warning_threshold_cycles' : bigint,
  'current_cycles' : bigint,
  'critical_threshold_cycles' : bigint,
}
export interface CanisterUpdateStats {
  'error_count' : bigint,
  'update_count' : bigint,
  'avg_time_ms' : bigint,
  'min_time_ms' : bigint,
  'max_time_ms' : bigint,
}
export type CaptureError = { 'SessionRegistrationAlreadyInProgress' : null } |
  { 'SessionRegistrationModeExpired' : null } |
  { 'HolderAuthnMethodRegistrationModeOff' : null } |
  { 'SessionRegistrationModeOff' : null } |
  { 'HolderAuthnMethodRegistrationUnauthorized' : null } |
  { 'InvalidMetadata' : string } |
  { 'HolderDeviceLost' : null };
export type CaptureState = { 'CaptureFailed' : { 'error' : CaptureError } } |
  { 'CreateEcdsaKey' : null } |
  { 'GetHolderContractPrincipal' : { 'frontend_hostname' : string } } |
  {
    'NeedConfirmAuthnMethodSessionRegistration' : {
      'confirmation_code' : string,
      'expiration' : bigint,
    }
  } |
  { 'ObtainingIdentityAuthnMethods' : null } |
  { 'RegisterAuthnMethodSession' : null } |
  { 'FinishCapture' : null } |
  { 'ExitAndRegisterHolderAuthnMethod' : { 'frontend_hostname' : string } } |
  {
    'DeletingIdentityAuthnMethods' : {
      'authn_pubkeys' : Array<Uint8Array | number[]>,
      'active_registration' : boolean,
      'openid_credentials' : [] | [Array<[string, string]>],
    }
  } |
  { 'StartCapture' : null } |
  {
    'NeedDeleteProtectedIdentityAuthnMethod' : {
      'public_key' : Uint8Array | number[],
      'meta_data' : Array<[string, string]>,
    }
  };
export type CheckAssetsState = { 'CheckAccountsForNoApprovePrepare' : null } |
  { 'FinishCheckAssets' : null } |
  {
    'CheckAccountsForNoApproveSequential' : {
      'sub_accounts' : Array<Uint8Array | number[]>,
    }
  } |
  { 'StartCheckAssets' : null };
export interface CompletedSaleDeal {
  'assets' : Timestamped_4,
  'buyer_account' : LedgerAccount,
  'seller' : Principal,
  'seller_transfer' : Timestamped_2,
  'buyer' : Principal,
  'seller_account' : LedgerAccount,
  'price' : bigint,
}
export interface Config {
  'hub_principal' : [] | [Principal],
  'target_templates' : BigUint64Array | bigint[],
  'indexing_interval_sec' : bigint,
  'discovery_interval_sec' : bigint,
  'indexing_batch_size' : bigint,
  'event_batch_size' : bigint,
}
export interface ConfirmAuthnMethodRegistrationError {
  'retries_left' : number,
  'verification_code' : string,
}
export interface DelayedTimestampMillis { 'time' : bigint, 'delay' : bigint }
export interface DelegationData {
  'signature' : [] | [Uint8Array | number[]],
  'public_key' : Uint8Array | number[],
  'hostname' : string,
  'timestamp' : bigint,
}
export type DelegationState = {
    'NeedPrepareDelegation' : { 'hostname' : string }
  } |
  {
    'GetDelegationWaiting' : {
      'delegation_data' : DelegationData,
      'get_delegation_request' : QueryCanisterSignedRequest,
    }
  };
export interface DiscoveryCycleStats {
  'cycle_count' : bigint,
  'avg_time_ms' : bigint,
  'total_time_ms' : bigint,
  'min_time_ms' : bigint,
  'max_time_ms' : bigint,
  'new_contracts' : bigint,
}
export interface EventFetchStats {
  'error_count' : bigint,
  'fetch_count' : bigint,
  'avg_time_ms' : bigint,
  'min_time_ms' : bigint,
  'max_time_ms' : bigint,
  'total_events' : bigint,
}
export type FetchAssetsState = { 'FinishFetchAssets' : null } |
  {
    'ObtainDelegationState' : {
      'sub_state' : DelegationState,
      'wrap_fetch_state' : FetchAssetsState,
    }
  } |
  { 'FetchNnsAssetsState' : { 'sub_state' : FetchNnsAssetsState } } |
  { 'StartFetchAssets' : null };
export type FetchNnsAssetsState = { 'GetNeuronsIds' : null } |
  {
    'GetNeuronsInformation' : {
      'neuron_hotkeys' : Array<[bigint, Array<Principal>]>,
    }
  } |
  {
    'DeletingNeuronsHotkeys' : {
      'neuron_hotkeys' : Array<[bigint, Array<Principal>]>,
    }
  } |
  { 'GetAccountsInformation' : null } |
  { 'GetAccountsBalances' : null };
export type GetConfigResponse = { 'Ok' : Config };
export interface GetHoldersArgs {
  'start_after' : [] | [Principal],
  'limit' : [] | [bigint],
}
export type GetHoldersResponse = { 'Ok' : GetHoldersResult };
export interface GetHoldersResult {
  'holders' : Array<HolderEntry>,
  'total_count' : bigint,
}
export type GetStatsResponse = { 'Ok' : GetStatsResult } |
  { 'Err' : string };
export interface GetStatsResult {
  'earliest_event_at' : [] | [bigint],
  'windows' : Array<StatsWindow>,
}
export type GetSyncStateResponse = { 'Ok' : SyncState };
export interface HolderAssets {
  'controlled_neurons' : [] | [Timestamped_1],
  'accounts' : [] | [Timestamped_3],
}
export interface HolderEntry {
  'updated_at' : bigint,
  'data' : HolderInformation,
  'contract_id' : Principal,
  'nns_principal' : [] | [Principal],
}
export interface HolderInformation {
  'identity_name' : [] | [string],
  'completed_sale_deal' : [] | [CompletedSaleDeal],
  'update_version' : bigint,
  'holding_timestamp' : [] | [bigint],
  'owner' : [] | [Principal],
  'assets' : [] | [Timestamped_4],
  'sale_deal' : [] | [SaleDeal],
  'processing_error' : [] | [Timestamped_6],
  'schedule_processing' : [] | [DelayedTimestampMillis],
  'state' : HolderState,
  'canister_cycles_state' : CanisterCyclesState,
  'fetching_assets' : [] | [HolderAssets],
  'identity_number' : [] | [bigint],
}
export type HolderProcessingError = { 'UpdateHolderError' : null } |
  { 'IcAgentError' : { 'error' : string, 'retry_delay' : [] | [bigint] } } |
  { 'DelegationExpired' : null } |
  { 'InternalError' : { 'error' : string } };
export type HolderState = {
    'Release' : {
      'sub_state' : ReleaseState,
      'release_initiation' : ReleaseInitiation,
    }
  } |
  { 'Closed' : { 'unsellable_reason' : [] | [UnsellableReason] } } |
  { 'WaitingStartCapture' : null } |
  { 'Capture' : { 'sub_state' : CaptureState } } |
  { 'Holding' : { 'sub_state' : HoldingState } } |
  { 'WaitingActivation' : null };
export type HoldingState = {
    'CheckAssets' : {
      'sub_state' : CheckAssetsState,
      'wrap_holding_state' : HoldingState,
    }
  } |
  {
    'CancelSaleDeal' : {
      'sub_state' : CancelSaleDealState,
      'wrap_holding_state' : HoldingState,
    }
  } |
  {
    'Hold' : {
      'quarantine' : [] | [bigint],
      'sale_deal_state' : [] | [SaleDealState],
    }
  } |
  {
    'FetchAssets' : {
      'fetch_assets_state' : FetchAssetsState,
      'wrap_holding_state' : HoldingState,
    }
  } |
  { 'Unsellable' : { 'reason' : UnsellableReason } } |
  { 'ValidateAssets' : { 'wrap_holding_state' : HoldingState } } |
  { 'StartHolding' : null };
export interface IndexingCycleStats {
  'cycle_count' : bigint,
  'avg_time_ms' : bigint,
  'total_time_ms' : bigint,
  'min_time_ms' : bigint,
  'max_time_ms' : bigint,
}
export type LedgerAccount = {
    'Account' : {
      'owner' : Principal,
      'subaccount' : [] | [Uint8Array | number[]],
    }
  } |
  { 'AccountIdentifier' : { 'slice' : Uint8Array | number[] } };
export type LimitFailureReason = { 'TooManyNeurons' : null } |
  { 'TooManyAccounts' : null };
export interface NeuronAsset {
  'info' : [] | [Timestamped],
  'neuron_id' : bigint,
}
export interface NeuronInformation {
  'staked_maturity_e8s_equivalent' : [] | [bigint],
  'controller' : [] | [Principal],
  'voting_power_refreshed_timestamp_seconds' : [] | [bigint],
  'kyc_verified' : boolean,
  'potential_voting_power' : [] | [bigint],
  'neuron_type' : [] | [number],
  'not_for_profit' : boolean,
  'maturity_e8s_equivalent' : bigint,
  'deciding_voting_power' : [] | [bigint],
  'cached_neuron_stake_e8s' : bigint,
  'created_timestamp_seconds' : bigint,
  'auto_stake_maturity' : [] | [boolean],
  'aging_since_timestamp_seconds' : bigint,
  'account' : Uint8Array | number[],
  'joined_community_fund_timestamp_seconds' : [] | [bigint],
  'neuron_information_extended' : [] | [NeuronInformationExtended],
  'neuron_fees_e8s' : bigint,
  'visibility' : [] | [number],
  'known_neuron_name' : [] | [string],
}
export interface NeuronInformationExtended {
  'dissolve_delay_seconds' : bigint,
  'state' : number,
  'age_seconds' : bigint,
}
export interface QueryCanisterSignedRequest {
  'request_sign' : Uint8Array | number[],
  'canister_id' : Principal,
}
export interface ReferralRewardData {
  'memo' : bigint,
  'account' : LedgerAccount,
}
export type ReleaseError = {
    'HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered' : null
  } |
  { 'AuthnMethodRegistrationModeEnterAlreadyInProgress' : null } |
  {
    'AuthnMethodRegistrationModeEnterInvalidRegistrationId' : {
      'error' : string,
    }
  } |
  { 'AuthnMethodRegistrationExpired' : null };
export type ReleaseInitiation = { 'DangerousToLoseIdentity' : null } |
  { 'IdentityAPIChanged' : null } |
  { 'Manual' : { 'unsellable_reason' : [] | [UnsellableReason] } };
export type ReleaseState = { 'DangerousToLoseIdentity' : null } |
  { 'IdentityAPIChanged' : null } |
  { 'DeleteHolderAuthnMethod' : null } |
  { 'StartRelease' : null } |
  {
    'ConfirmAuthnMethodRegistration' : {
      'expiration' : bigint,
      'verification_code' : string,
      'registration_id' : string,
    }
  } |
  { 'ReleaseFailed' : { 'error' : ReleaseError } } |
  {
    'EnterAuthnMethodRegistrationMode' : { 'registration_id' : [] | [string] }
  } |
  {
    'WaitingAuthnMethodRegistration' : {
      'expiration' : bigint,
      'confirm_error' : [] | [ConfirmAuthnMethodRegistrationError],
      'registration_id' : string,
    }
  } |
  {
    'EnsureOrphanedRegistrationExited' : { 'registration_id' : [] | [string] }
  } |
  { 'CheckingAccessFromOwnerAuthnMethod' : null };
export interface SaleDeal {
  'receiver_account' : LedgerAccount,
  'offers' : Array<Timestamped_5>,
  'sale_price' : [] | [Timestamped_2],
  'expiration_time' : bigint,
}
export type SaleDealAcceptSubState = { 'TransferDeveloperReward' : null } |
  { 'StartAccept' : null } |
  { 'TransferHubReward' : null } |
  { 'ResolveReferralRewardData' : null } |
  { 'TransferSaleDealAmountToSellerAccount' : null } |
  { 'TransferReferralReward' : { 'reward_data' : [] | [ReferralRewardData] } } |
  { 'TransferSaleDealAmountToTransitAccount' : null };
export type SaleDealState = {
    'Accept' : { 'sub_state' : SaleDealAcceptSubState, 'buyer' : Principal }
  } |
  { 'Trading' : null } |
  { 'WaitingSellOffer' : null };
export interface StatsWindow {
  'event_fetches' : EventFetchStats,
  'canister_updates' : CanisterUpdateStats,
  'discovery' : DiscoveryCycleStats,
  'window_seconds' : bigint,
  'indexing' : IndexingCycleStats,
}
export interface SubAccountInformation {
  'sub_account_information' : AccountInformation,
  'name' : string,
  'sub_account' : Uint8Array | number[],
}
export interface SyncState {
  'is_syncing' : boolean,
  'last_hub_offset' : bigint,
  'last_sync_timestamp' : [] | [bigint],
}
export interface Timestamped {
  'value' : NeuronInformation,
  'timestamp' : bigint,
}
export interface Timestamped_1 {
  'value' : Array<NeuronAsset>,
  'timestamp' : bigint,
}
export interface Timestamped_2 { 'value' : bigint, 'timestamp' : bigint }
export interface Timestamped_3 {
  'value' : [] | [AccountsInformation],
  'timestamp' : bigint,
}
export interface Timestamped_4 { 'value' : HolderAssets, 'timestamp' : bigint }
export interface Timestamped_5 { 'value' : BuyerOffer, 'timestamp' : bigint }
export interface Timestamped_6 {
  'value' : HolderProcessingError,
  'timestamp' : bigint,
}
export type TriggerSyncResponse = { 'Ok' : null } |
  { 'Err' : string };
export type UnsellableReason = { 'ValidationFailed' : { 'reason' : string } } |
  { 'CertificateExpired' : null } |
  { 'CheckLimitFailed' : { 'reason' : LimitFailureReason } } |
  { 'ApproveOnAccount' : { 'sub_account' : Uint8Array | number[] } } |
  { 'SaleDealCompleted' : null };
export interface UpdateIntervalsArgs {
  'indexing_interval_sec' : bigint,
  'discovery_interval_sec' : bigint,
}
export interface UpdateTargetTemplatesArgs {
  'templates' : BigUint64Array | bigint[],
}
export interface _SERVICE {
  'get_config' : ActorMethod<[{}], GetConfigResponse>,
  'get_holders' : ActorMethod<[GetHoldersArgs], GetHoldersResponse>,
  'get_stats' : ActorMethod<[{}], GetStatsResponse>,
  'get_sync_state' : ActorMethod<[{}], GetSyncStateResponse>,
  'trigger_sync' : ActorMethod<[{}], TriggerSyncResponse>,
  'update_intervals' : ActorMethod<[UpdateIntervalsArgs], TriggerSyncResponse>,
  'update_target_templates' : ActorMethod<
    [UpdateTargetTemplatesArgs],
    TriggerSyncResponse
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
