"use client";
// Lien "Crédits photos" : les licences libres (CC BY, CC BY-SA...) demandent de citer
// l'auteur et la licence de chaque photo.

import { useState } from "react";
import { usePhotos } from "./photos";

export default function PhotoCredits() {
  const [open, setOpen] = useState(false);
  const photos = Object.entries(usePhotos()).filter(([, photo]) => photo !== null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="underline hover:text-zinc-400">
        Crédits photos
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Crédits photos"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 text-left text-sm text-zinc-300"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Crédits photos</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white">
                ✕
              </button>
            </div>
            <p className="mb-4 text-xs text-zinc-500">
              Photos libres de droits issues de Wikimedia Commons, utilisées selon leur licence.
            </p>
            <ul className="flex flex-col gap-2">
              {photos.map(([name, photo]) => (
                <li key={name}>
                  <span className="font-medium text-white">{name}</span> — {photo!.author},{" "}
                  <a href={photo!.source} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                    {photo!.license}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
