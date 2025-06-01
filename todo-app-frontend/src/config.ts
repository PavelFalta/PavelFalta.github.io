import { Configuration } from "./api"; // Import generated Configuration

export const BASE_PATH = "https://todo-backend-production-df5a.up.railway.app";

export const createBaseConfig = (): Configuration => {
    return new Configuration({
      basePath: BASE_PATH,
    });
  };
  
  // Configuration with auth token
  export const createAuthConfig = (token: string): Configuration => {
    // Format the token as a bearer token if it doesn't already have the prefix
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    return new Configuration({
      basePath: BASE_PATH,
      accessToken: formattedToken,
    });
  }; 