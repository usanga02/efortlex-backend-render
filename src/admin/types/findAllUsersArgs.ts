export type FindAllUsersArgs = {
  offset: number;
  limit: number;
  search?: string;
  role?: 'ADMIN' | 'LANDLORD' | 'TENANT' | 'AGENT';
};
