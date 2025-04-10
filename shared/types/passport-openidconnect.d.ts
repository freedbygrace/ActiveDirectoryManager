declare module 'passport-openidconnect' {
  import { Strategy as PassportStrategy } from 'passport';
  
  export interface Profile {
    id: string;
    displayName?: string;
    name?: {
      familyName?: string;
      givenName?: string;
      middleName?: string;
    };
    emails?: Array<{ value: string; type?: string }>;
    photos?: Array<{ value: string }>;
    username?: string;
    _json: any;
    _raw: string;
  }

  export interface StrategyOptions {
    issuer?: string;
    authorizationURL?: string;
    tokenURL?: string;
    userInfoURL?: string;
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string | string[];
    passReqToCallback?: false;
  }

  export interface StrategyOptionsWithRequest {
    issuer?: string;
    authorizationURL?: string;
    tokenURL?: string;
    userInfoURL?: string;
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string | string[];
    passReqToCallback: true;
  }

  export type VerifyCallback = (
    err?: Error | null,
    user?: object,
    info?: object
  ) => void;

  export type VerifyFunction = (
    issuer: string,
    profile: Profile,
    verified: VerifyCallback
  ) => void;

  export type VerifyFunctionWithRequest = (
    req: object,
    issuer: string,
    profile: Profile,
    verified: VerifyCallback
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: VerifyFunction
    );
    constructor(
      options: StrategyOptionsWithRequest,
      verify: VerifyFunctionWithRequest
    );

    name: string;
    authenticate(req: object, options?: object): void;
  }
}