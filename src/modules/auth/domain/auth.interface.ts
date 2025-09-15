export interface LoginInterface{
    email: string,
    password: string
}

export interface SignupInterface{
    name: string;
    phone: string;
    email: string;
    password: string;
    company_id: number;
    avatar?: string;
}