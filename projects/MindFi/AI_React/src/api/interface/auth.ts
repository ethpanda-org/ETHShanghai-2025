export interface AuthNonce {
    address: string;
}
export interface LoginModel {
    username: string;
    password: string;
}

export interface Response<T> {
    code: number;
    data: T;
}