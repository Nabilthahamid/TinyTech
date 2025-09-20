export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  bio?: string;
  website?: string;
  location?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
}

export interface UpdateUserData {
  name?: string;
  bio?: string;
  website?: string;
  location?: string;
  avatar_url?: string;
}
