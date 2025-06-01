import { useMemo } from 'react';
import { AuthApi, BoardsApi, InvitationsApi /*, TodosApi, CategoriesApi*/ } from '../api';
import { createAuthConfig, createBaseConfig } from '../config';
import { useAuth } from '../context/AuthContext';

export const useApiClient = () => {
  const { token } = useAuth();

  const apiClients = useMemo(() => {
    const config = token ? createAuthConfig(token) : createBaseConfig();
    return {
      authApi: new AuthApi(config),
      boardsApi: new BoardsApi(config),
      invitationsApi: new InvitationsApi(config),
      // todosApi: new TodosApi(config),
      // categoriesApi: new CategoriesApi(config),
    };
  }, [token]);

  return apiClients;
};