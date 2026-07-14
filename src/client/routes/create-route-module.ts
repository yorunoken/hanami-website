import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface RouteModule<Props extends object> {
  Component: LazyExoticComponent<ComponentType<Props>>;
  preload: () => Promise<{ default: ComponentType<Props> }>;
}

export function createRouteModule<Props extends object>(
  importer: () => Promise<{ default: ComponentType<Props> }>,
): RouteModule<Props> {
  let pending: Promise<{ default: ComponentType<Props> }> | undefined;

  const preload = () => {
    pending ??= importer().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });

    return pending;
  };

  return {
    Component: lazy(preload),
    preload,
  };
}
