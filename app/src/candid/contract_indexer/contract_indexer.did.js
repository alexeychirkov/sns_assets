export const idlFactory = ({ IDL }) => {
  const FetchAssetsState = IDL.Rec();
  const HoldingState = IDL.Rec();
  const Config = IDL.Record({
    'hub_principal' : IDL.Opt(IDL.Principal),
    'target_templates' : IDL.Vec(IDL.Nat64),
    'indexing_interval_sec' : IDL.Nat64,
    'discovery_interval_sec' : IDL.Nat64,
    'indexing_batch_size' : IDL.Nat64,
    'event_batch_size' : IDL.Nat64,
  });
  const GetConfigResponse = IDL.Variant({ 'Ok' : Config });
  const GetHoldersArgs = IDL.Record({
    'start_after' : IDL.Opt(IDL.Principal),
    'limit' : IDL.Opt(IDL.Nat64),
  });
  const NeuronInformationExtended = IDL.Record({
    'dissolve_delay_seconds' : IDL.Nat64,
    'state' : IDL.Int32,
    'age_seconds' : IDL.Nat64,
  });
  const NeuronInformation = IDL.Record({
    'staked_maturity_e8s_equivalent' : IDL.Opt(IDL.Nat64),
    'controller' : IDL.Opt(IDL.Principal),
    'voting_power_refreshed_timestamp_seconds' : IDL.Opt(IDL.Nat64),
    'kyc_verified' : IDL.Bool,
    'potential_voting_power' : IDL.Opt(IDL.Nat64),
    'neuron_type' : IDL.Opt(IDL.Int32),
    'not_for_profit' : IDL.Bool,
    'maturity_e8s_equivalent' : IDL.Nat64,
    'deciding_voting_power' : IDL.Opt(IDL.Nat64),
    'cached_neuron_stake_e8s' : IDL.Nat64,
    'created_timestamp_seconds' : IDL.Nat64,
    'auto_stake_maturity' : IDL.Opt(IDL.Bool),
    'aging_since_timestamp_seconds' : IDL.Nat64,
    'account' : IDL.Vec(IDL.Nat8),
    'joined_community_fund_timestamp_seconds' : IDL.Opt(IDL.Nat64),
    'neuron_information_extended' : IDL.Opt(NeuronInformationExtended),
    'neuron_fees_e8s' : IDL.Nat64,
    'visibility' : IDL.Opt(IDL.Int32),
    'known_neuron_name' : IDL.Opt(IDL.Text),
  });
  const Timestamped = IDL.Record({
    'value' : NeuronInformation,
    'timestamp' : IDL.Nat64,
  });
  const NeuronAsset = IDL.Record({
    'info' : IDL.Opt(Timestamped),
    'neuron_id' : IDL.Nat64,
  });
  const Timestamped_1 = IDL.Record({
    'value' : IDL.Vec(NeuronAsset),
    'timestamp' : IDL.Nat64,
  });
  const Timestamped_2 = IDL.Record({
    'value' : IDL.Nat64,
    'timestamp' : IDL.Nat64,
  });
  const AccountInformation = IDL.Record({
    'balance' : IDL.Opt(Timestamped_2),
    'account_identifier' : IDL.Vec(IDL.Nat8),
  });
  const SubAccountInformation = IDL.Record({
    'sub_account_information' : AccountInformation,
    'name' : IDL.Text,
    'sub_account' : IDL.Vec(IDL.Nat8),
  });
  const AccountsInformation = IDL.Record({
    'principal' : IDL.Principal,
    'main_account_information' : IDL.Opt(AccountInformation),
    'sub_accounts' : IDL.Vec(SubAccountInformation),
  });
  const Timestamped_3 = IDL.Record({
    'value' : IDL.Opt(AccountsInformation),
    'timestamp' : IDL.Nat64,
  });
  const HolderAssets = IDL.Record({
    'controlled_neurons' : IDL.Opt(Timestamped_1),
    'accounts' : IDL.Opt(Timestamped_3),
  });
  const Timestamped_4 = IDL.Record({
    'value' : HolderAssets,
    'timestamp' : IDL.Nat64,
  });
  const LedgerAccount = IDL.Variant({
    'Account' : IDL.Record({
      'owner' : IDL.Principal,
      'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    }),
    'AccountIdentifier' : IDL.Record({ 'slice' : IDL.Vec(IDL.Nat8) }),
  });
  const CompletedSaleDeal = IDL.Record({
    'assets' : Timestamped_4,
    'buyer_account' : LedgerAccount,
    'seller' : IDL.Principal,
    'seller_transfer' : Timestamped_2,
    'buyer' : IDL.Principal,
    'seller_account' : LedgerAccount,
    'price' : IDL.Nat64,
  });
  const BuyerOffer = IDL.Record({
    'referral' : IDL.Opt(IDL.Text),
    'offer_amount' : IDL.Nat64,
    'buyer' : IDL.Principal,
    'approved_account' : LedgerAccount,
  });
  const Timestamped_5 = IDL.Record({
    'value' : BuyerOffer,
    'timestamp' : IDL.Nat64,
  });
  const SaleDeal = IDL.Record({
    'receiver_account' : LedgerAccount,
    'offers' : IDL.Vec(Timestamped_5),
    'sale_price' : IDL.Opt(Timestamped_2),
    'expiration_time' : IDL.Nat64,
  });
  const HolderProcessingError = IDL.Variant({
    'UpdateHolderError' : IDL.Null,
    'IcAgentError' : IDL.Record({
      'error' : IDL.Text,
      'retry_delay' : IDL.Opt(IDL.Nat64),
    }),
    'DelegationExpired' : IDL.Null,
    'InternalError' : IDL.Record({ 'error' : IDL.Text }),
  });
  const Timestamped_6 = IDL.Record({
    'value' : HolderProcessingError,
    'timestamp' : IDL.Nat64,
  });
  const DelayedTimestampMillis = IDL.Record({
    'time' : IDL.Nat64,
    'delay' : IDL.Nat64,
  });
  const ReleaseError = IDL.Variant({
    'HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered' : IDL.Null,
    'AuthnMethodRegistrationModeEnterAlreadyInProgress' : IDL.Null,
    'AuthnMethodRegistrationModeEnterInvalidRegistrationId' : IDL.Record({
      'error' : IDL.Text,
    }),
    'AuthnMethodRegistrationExpired' : IDL.Null,
  });
  const ConfirmAuthnMethodRegistrationError = IDL.Record({
    'retries_left' : IDL.Nat8,
    'verification_code' : IDL.Text,
  });
  const ReleaseState = IDL.Variant({
    'DangerousToLoseIdentity' : IDL.Null,
    'IdentityAPIChanged' : IDL.Null,
    'DeleteHolderAuthnMethod' : IDL.Null,
    'StartRelease' : IDL.Null,
    'ConfirmAuthnMethodRegistration' : IDL.Record({
      'expiration' : IDL.Nat64,
      'verification_code' : IDL.Text,
      'registration_id' : IDL.Text,
    }),
    'ReleaseFailed' : IDL.Record({ 'error' : ReleaseError }),
    'EnterAuthnMethodRegistrationMode' : IDL.Record({
      'registration_id' : IDL.Opt(IDL.Text),
    }),
    'WaitingAuthnMethodRegistration' : IDL.Record({
      'expiration' : IDL.Nat64,
      'confirm_error' : IDL.Opt(ConfirmAuthnMethodRegistrationError),
      'registration_id' : IDL.Text,
    }),
    'EnsureOrphanedRegistrationExited' : IDL.Record({
      'registration_id' : IDL.Opt(IDL.Text),
    }),
    'CheckingAccessFromOwnerAuthnMethod' : IDL.Null,
  });
  const LimitFailureReason = IDL.Variant({
    'TooManyNeurons' : IDL.Null,
    'TooManyAccounts' : IDL.Null,
  });
  const UnsellableReason = IDL.Variant({
    'ValidationFailed' : IDL.Record({ 'reason' : IDL.Text }),
    'CertificateExpired' : IDL.Null,
    'CheckLimitFailed' : IDL.Record({ 'reason' : LimitFailureReason }),
    'ApproveOnAccount' : IDL.Record({ 'sub_account' : IDL.Vec(IDL.Nat8) }),
    'SaleDealCompleted' : IDL.Null,
  });
  const ReleaseInitiation = IDL.Variant({
    'DangerousToLoseIdentity' : IDL.Null,
    'IdentityAPIChanged' : IDL.Null,
    'Manual' : IDL.Record({ 'unsellable_reason' : IDL.Opt(UnsellableReason) }),
  });
  const CaptureError = IDL.Variant({
    'SessionRegistrationAlreadyInProgress' : IDL.Null,
    'SessionRegistrationModeExpired' : IDL.Null,
    'HolderAuthnMethodRegistrationModeOff' : IDL.Null,
    'SessionRegistrationModeOff' : IDL.Null,
    'HolderAuthnMethodRegistrationUnauthorized' : IDL.Null,
    'InvalidMetadata' : IDL.Text,
    'HolderDeviceLost' : IDL.Null,
  });
  const CaptureState = IDL.Variant({
    'CaptureFailed' : IDL.Record({ 'error' : CaptureError }),
    'CreateEcdsaKey' : IDL.Null,
    'GetHolderContractPrincipal' : IDL.Record({
      'frontend_hostname' : IDL.Text,
    }),
    'NeedConfirmAuthnMethodSessionRegistration' : IDL.Record({
      'confirmation_code' : IDL.Text,
      'expiration' : IDL.Nat64,
    }),
    'ObtainingIdentityAuthnMethods' : IDL.Null,
    'RegisterAuthnMethodSession' : IDL.Null,
    'FinishCapture' : IDL.Null,
    'ExitAndRegisterHolderAuthnMethod' : IDL.Record({
      'frontend_hostname' : IDL.Text,
    }),
    'DeletingIdentityAuthnMethods' : IDL.Record({
      'authn_pubkeys' : IDL.Vec(IDL.Vec(IDL.Nat8)),
      'active_registration' : IDL.Bool,
      'openid_credentials' : IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))),
    }),
    'StartCapture' : IDL.Null,
    'NeedDeleteProtectedIdentityAuthnMethod' : IDL.Record({
      'public_key' : IDL.Vec(IDL.Nat8),
      'meta_data' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    }),
  });
  const CheckAssetsState = IDL.Variant({
    'CheckAccountsForNoApprovePrepare' : IDL.Null,
    'FinishCheckAssets' : IDL.Null,
    'CheckAccountsForNoApproveSequential' : IDL.Record({
      'sub_accounts' : IDL.Vec(IDL.Vec(IDL.Nat8)),
    }),
    'StartCheckAssets' : IDL.Null,
  });
  const ReferralRewardData = IDL.Record({
    'memo' : IDL.Nat64,
    'account' : LedgerAccount,
  });
  const SaleDealAcceptSubState = IDL.Variant({
    'TransferDeveloperReward' : IDL.Null,
    'StartAccept' : IDL.Null,
    'TransferHubReward' : IDL.Null,
    'ResolveReferralRewardData' : IDL.Null,
    'TransferSaleDealAmountToSellerAccount' : IDL.Null,
    'TransferReferralReward' : IDL.Record({
      'reward_data' : IDL.Opt(ReferralRewardData),
    }),
    'TransferSaleDealAmountToTransitAccount' : IDL.Null,
  });
  const SaleDealState = IDL.Variant({
    'Accept' : IDL.Record({
      'sub_state' : SaleDealAcceptSubState,
      'buyer' : IDL.Principal,
    }),
    'Trading' : IDL.Null,
    'WaitingSellOffer' : IDL.Null,
  });
  const CancelSaleDealState = IDL.Variant({
    'RefundBuyerFromTransitAccount' : IDL.Record({ 'buyer' : IDL.Principal }),
    'StartCancelSaleDeal' : IDL.Record({ 'sale_deal_state' : SaleDealState }),
  });
  const DelegationData = IDL.Record({
    'signature' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'public_key' : IDL.Vec(IDL.Nat8),
    'hostname' : IDL.Text,
    'timestamp' : IDL.Nat,
  });
  const QueryCanisterSignedRequest = IDL.Record({
    'request_sign' : IDL.Vec(IDL.Nat8),
    'canister_id' : IDL.Principal,
  });
  const DelegationState = IDL.Variant({
    'NeedPrepareDelegation' : IDL.Record({ 'hostname' : IDL.Text }),
    'GetDelegationWaiting' : IDL.Record({
      'delegation_data' : DelegationData,
      'get_delegation_request' : QueryCanisterSignedRequest,
    }),
  });
  const FetchNnsAssetsState = IDL.Variant({
    'GetNeuronsIds' : IDL.Null,
    'GetNeuronsInformation' : IDL.Record({
      'neuron_hotkeys' : IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Vec(IDL.Principal))),
    }),
    'DeletingNeuronsHotkeys' : IDL.Record({
      'neuron_hotkeys' : IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Vec(IDL.Principal))),
    }),
    'GetAccountsInformation' : IDL.Null,
    'GetAccountsBalances' : IDL.Null,
  });
  FetchAssetsState.fill(
    IDL.Variant({
      'FinishFetchAssets' : IDL.Null,
      'ObtainDelegationState' : IDL.Record({
        'sub_state' : DelegationState,
        'wrap_fetch_state' : FetchAssetsState,
      }),
      'FetchNnsAssetsState' : IDL.Record({ 'sub_state' : FetchNnsAssetsState }),
      'StartFetchAssets' : IDL.Null,
    })
  );
  HoldingState.fill(
    IDL.Variant({
      'CheckAssets' : IDL.Record({
        'sub_state' : CheckAssetsState,
        'wrap_holding_state' : HoldingState,
      }),
      'CancelSaleDeal' : IDL.Record({
        'sub_state' : CancelSaleDealState,
        'wrap_holding_state' : HoldingState,
      }),
      'Hold' : IDL.Record({
        'quarantine' : IDL.Opt(IDL.Nat64),
        'sale_deal_state' : IDL.Opt(SaleDealState),
      }),
      'FetchAssets' : IDL.Record({
        'fetch_assets_state' : FetchAssetsState,
        'wrap_holding_state' : HoldingState,
      }),
      'Unsellable' : IDL.Record({ 'reason' : UnsellableReason }),
      'ValidateAssets' : IDL.Record({ 'wrap_holding_state' : HoldingState }),
      'StartHolding' : IDL.Null,
    })
  );
  const HolderState = IDL.Variant({
    'Release' : IDL.Record({
      'sub_state' : ReleaseState,
      'release_initiation' : ReleaseInitiation,
    }),
    'Closed' : IDL.Record({ 'unsellable_reason' : IDL.Opt(UnsellableReason) }),
    'WaitingStartCapture' : IDL.Null,
    'Capture' : IDL.Record({ 'sub_state' : CaptureState }),
    'Holding' : IDL.Record({ 'sub_state' : HoldingState }),
    'WaitingActivation' : IDL.Null,
  });
  const CanisterCyclesState = IDL.Record({
    'initial_cycles' : IDL.Nat,
    'warning_threshold_cycles' : IDL.Nat,
    'current_cycles' : IDL.Nat,
    'critical_threshold_cycles' : IDL.Nat,
  });
  const HolderInformation = IDL.Record({
    'identity_name' : IDL.Opt(IDL.Text),
    'completed_sale_deal' : IDL.Opt(CompletedSaleDeal),
    'update_version' : IDL.Nat64,
    'holding_timestamp' : IDL.Opt(IDL.Nat64),
    'owner' : IDL.Opt(IDL.Principal),
    'assets' : IDL.Opt(Timestamped_4),
    'sale_deal' : IDL.Opt(SaleDeal),
    'processing_error' : IDL.Opt(Timestamped_6),
    'schedule_processing' : IDL.Opt(DelayedTimestampMillis),
    'state' : HolderState,
    'canister_cycles_state' : CanisterCyclesState,
    'fetching_assets' : IDL.Opt(HolderAssets),
    'identity_number' : IDL.Opt(IDL.Nat64),
  });
  const HolderEntry = IDL.Record({
    'updated_at' : IDL.Nat64,
    'data' : HolderInformation,
    'contract_id' : IDL.Principal,
    'nns_principal' : IDL.Opt(IDL.Principal),
  });
  const GetHoldersResult = IDL.Record({
    'holders' : IDL.Vec(HolderEntry),
    'total_count' : IDL.Nat64,
  });
  const GetHoldersResponse = IDL.Variant({ 'Ok' : GetHoldersResult });
  const EventFetchStats = IDL.Record({
    'error_count' : IDL.Nat64,
    'fetch_count' : IDL.Nat64,
    'avg_time_ms' : IDL.Nat64,
    'min_time_ms' : IDL.Nat64,
    'max_time_ms' : IDL.Nat64,
    'total_events' : IDL.Nat64,
  });
  const CanisterUpdateStats = IDL.Record({
    'error_count' : IDL.Nat64,
    'update_count' : IDL.Nat64,
    'avg_time_ms' : IDL.Nat64,
    'min_time_ms' : IDL.Nat64,
    'max_time_ms' : IDL.Nat64,
  });
  const DiscoveryCycleStats = IDL.Record({
    'cycle_count' : IDL.Nat64,
    'avg_time_ms' : IDL.Nat64,
    'total_time_ms' : IDL.Nat64,
    'min_time_ms' : IDL.Nat64,
    'max_time_ms' : IDL.Nat64,
    'new_contracts' : IDL.Nat64,
  });
  const IndexingCycleStats = IDL.Record({
    'cycle_count' : IDL.Nat64,
    'avg_time_ms' : IDL.Nat64,
    'total_time_ms' : IDL.Nat64,
    'min_time_ms' : IDL.Nat64,
    'max_time_ms' : IDL.Nat64,
  });
  const StatsWindow = IDL.Record({
    'event_fetches' : EventFetchStats,
    'canister_updates' : CanisterUpdateStats,
    'discovery' : DiscoveryCycleStats,
    'window_seconds' : IDL.Nat64,
    'indexing' : IndexingCycleStats,
  });
  const GetStatsResult = IDL.Record({
    'earliest_event_at' : IDL.Opt(IDL.Nat64),
    'windows' : IDL.Vec(StatsWindow),
  });
  const GetStatsResponse = IDL.Variant({
    'Ok' : GetStatsResult,
    'Err' : IDL.Text,
  });
  const SyncState = IDL.Record({
    'is_syncing' : IDL.Bool,
    'last_hub_offset' : IDL.Nat64,
    'last_sync_timestamp' : IDL.Opt(IDL.Nat64),
  });
  const GetSyncStateResponse = IDL.Variant({ 'Ok' : SyncState });
  const TriggerSyncResponse = IDL.Variant({
    'Ok' : IDL.Null,
    'Err' : IDL.Text,
  });
  const UpdateIntervalsArgs = IDL.Record({
    'indexing_interval_sec' : IDL.Nat64,
    'discovery_interval_sec' : IDL.Nat64,
  });
  const UpdateTargetTemplatesArgs = IDL.Record({
    'templates' : IDL.Vec(IDL.Nat64),
  });
  return IDL.Service({
    'get_config' : IDL.Func([IDL.Record({})], [GetConfigResponse], ['query']),
    'get_holders' : IDL.Func([GetHoldersArgs], [GetHoldersResponse], ['query']),
    'get_stats' : IDL.Func([IDL.Record({})], [GetStatsResponse], ['query']),
    'get_sync_state' : IDL.Func(
        [IDL.Record({})],
        [GetSyncStateResponse],
        ['query'],
      ),
    'trigger_sync' : IDL.Func([IDL.Record({})], [TriggerSyncResponse], []),
    'update_intervals' : IDL.Func(
        [UpdateIntervalsArgs],
        [TriggerSyncResponse],
        [],
      ),
    'update_target_templates' : IDL.Func(
        [UpdateTargetTemplatesArgs],
        [TriggerSyncResponse],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
