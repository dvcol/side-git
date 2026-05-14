import type { Route, RouterOptions } from '@dvcol/svelte-simple-router/models';

export const RouteName = {
  Hello: 'hello',
  Goodbye: 'goodbye',
  Home: 'home',
  Any: 'any',
} as const;

export type RouteNames = (typeof RouteName)[keyof typeof RouteName];

export const routes: Readonly<Route<RouteNames>[]> = [
  {
    name: RouteName.Home,
    path: '/',
    redirect: {
      name: RouteName.Hello,
    },
  },
  {
    name: RouteName.Hello,
    path: `/${RouteName.Hello}`,
    component: async () => import('~/components/views/HelloComponent.svelte'),
  },
  {
    name: RouteName.Goodbye,
    path: `/${RouteName.Goodbye}`,
    component: async () => import('~/components/views/GoodbyeComponent.svelte'),
  },
  {
    name: RouteName.Any,
    path: '*',
    redirect: {
      name: RouteName.Hello,
    },
  },
] as const;

export const options: RouterOptions<RouteNames> = {
  hash: true,
  routes,
} as const;
