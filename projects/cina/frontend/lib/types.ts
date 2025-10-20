export type ActionType = 'proposal_draft' | 'vote' | 'info' | 'error';

export interface ProposalDraft {
  title: string;
  description: string;
  fundAmountWei: string;
  target: string;
  calldata?: string;
  gasEstimate?: number;
}

export interface ActionProtocol<T=any> {
  type: ActionType;
  data: T;
  next_step?: 'ask_user_confirm' | 'ready_to_submit' | 'none';
  notes?: string;
}
