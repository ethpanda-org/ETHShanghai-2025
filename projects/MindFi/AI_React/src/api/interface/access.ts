export interface AccessStatus {
    used: number;
    daily_limit: number;
}

export interface ProfitStatus {
    address: string;
    total_profit_eth: number;
    records: { date: string; profit_eth: number }[];
}

