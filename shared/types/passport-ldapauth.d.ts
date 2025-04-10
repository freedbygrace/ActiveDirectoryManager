declare module 'passport-ldapauth' {
  import { Strategy as PassportStrategy } from 'passport';
  
  export interface LdapAuthOptions {
    server: {
      url: string;
      bindDN?: string;
      bindCredentials?: string;
      searchBase: string;
      searchFilter: string;
      searchAttributes?: string[];
      tlsOptions?: {
        rejectUnauthorized?: boolean;
      };
    };
    usernameField?: string;
    passwordField?: string;
    passReqToCallback?: boolean;
  }

  export type VerifyCallback = (
    err?: Error | null,
    user?: object,
    info?: object
  ) => void;

  export type VerifyFunction = (
    user: any,
    verified: VerifyCallback
  ) => void;

  export type VerifyFunctionWithRequest = (
    req: object,
    user: any,
    verified: VerifyCallback
  ) => void;

  export default class Strategy extends PassportStrategy {
    constructor(
      options: LdapAuthOptions,
      verify?: VerifyFunction | VerifyFunctionWithRequest
    );

    name: string;
    authenticate(req: object, options?: object): void;
  }
}