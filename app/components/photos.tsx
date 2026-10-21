"use client";
// Les photos des joueurs (data/photos.json), accessibles depuis n'importe quel composant
// grâce à un "contexte" React, sans les passer à la main de composant en composant.

import { createContext, useContext, type ReactNode } from "react";
import type { PlayerPhoto } from "@/lib/types";

export type Photos = Record<string, PlayerPhoto | null>;

const PhotosContext = createContext<Photos>({});

export function PhotosProvider({ photos, children }: { photos: Photos; children: ReactNode }) {
  return <PhotosContext.Provider value={photos}>{children}</PhotosContext.Provider>;
}

// Photo d'un joueur (par son nom), ou null s'il n'en a pas
export function usePhoto(name: string): PlayerPhoto | null {
  return useContext(PhotosContext)[name] ?? null;
}

export function usePhotos(): Photos {
  return useContext(PhotosContext);
}
