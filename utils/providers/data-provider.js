import React from 'react';
import { Route, useNavigate } from 'react-router-dom';
import {
  fetchHydra as baseFetchHydra,
  hydraDataProvider as baseHydraDataProvider,
  useIntrospection
} from '@api-platform/admin';
import { parseHydraDocumentation } from '@api-platform/api-doc-parser';
import { fetchMercureSecureJwt } from '../mercure-jwt';
import { authCleanup, validateToken } from './auth-provider';

const entrypoint = document.getElementById('api-entrypoint').innerText;

const getHeaders = () => {
  const headers = {};

  const token = window.localStorage.getItem('auth');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const locale = window.localStorage.getItem('locale');
  if (locale) {
    headers['X-Locale'] = locale;
  }

  return headers;
};

const fetchHydra = (url, options = {}) =>
  baseFetchHydra(url, {
    ...options,
    headers: getHeaders
  });

const RedirectToLogin = () => {
  const introspect = useIntrospection();
  const redirect = useNavigate();

  if (window.localStorage.getItem('auth')) {
    introspect();
    return <></>;
  }

  redirect('/login');
};

const apiDocumentationParser = async () => {
  try {
    return await parseHydraDocumentation(entrypoint, {
      headers: getHeaders
    });
  } catch (result) {
    const { api, response, status, error } = result;
    if (status !== 401 || !response) {
      console.error(error);
      // throw result;
    }

    // Prevent infinite loop if the token is expired
    authCleanup();

    return {
      api,
      response,
      status,
      customRoutes: [
        <Route key='login-redirect' path='/' element={<RedirectToLogin />} />
      ]
    };
  }
};

const fetchMercureConfig = async () => {
  try {
    if (validateToken()) {
      fetchMercureSecureJwt();
    }

    const hubUrl = new URL(
      document.getElementById('mercure-entrypoint').innerText
    );

    return {
      hub: hubUrl.href, // 'https://reward-cloud.local/.well-known/mercure'
      topicUrl: window.location.origin // 'https://reward-cloud.local',
    };
  } catch (error) {
    console.error(error);
    return false;
  }
};

const getDataProvider = async () => {
  return baseHydraDataProvider({
    entrypoint,
    httpClient: fetchHydra,
    apiDocumentationParser,
    useEmbedded: true,
    mercure: await fetchMercureConfig()
  });
};

export default getDataProvider;
