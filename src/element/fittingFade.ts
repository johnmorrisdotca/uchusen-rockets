// A fitting fades on its own material. The shared one stays as it was made, so a fade never leaves it a second program, and the copy is disposed when the fade ends, which deletes the vertex arrays that program drew.

import { type Material, Mesh, MeshStandardMaterial } from "three";

const FADE = "fitFade";

/** Draw `mesh` at `level` (0 gone, 1 solid). A level in between uses a copy, disposed as soon as the fade ends. */
export function fadeFitting(mesh: Mesh, level: number): void {
  const current = mesh.material;
  if (Array.isArray(current) || !("opacity" in current)) {
    mesh.visible = level > 0;
    return;
  }
  const own = (mesh.userData.fitOwn as MeshStandardMaterial | undefined) ?? (current as MeshStandardMaterial);
  if (mesh.userData.fitOpacity === undefined) {
    mesh.userData.fitOpacity = own.opacity;
    mesh.userData.fitTransparent = own.transparent;
    mesh.userData.fitDepthWrite = own.depthWrite;
  }
  const fade = mesh.userData[FADE] as MeshStandardMaterial | undefined;
  if (level > 0 && level < 1) {
    const copy = fade ?? own.clone();
    copy.transparent = true;
    copy.depthWrite = false;
    copy.opacity = (mesh.userData.fitOpacity as number) * level;
    mesh.userData[FADE] = copy;
    mesh.userData.fitOwn = own;
    mesh.material = copy;
    mesh.visible = true;
    return;
  }
  if (fade) {
    if (mesh.material === fade) mesh.material = own;
    fade.dispose();
    delete mesh.userData[FADE];
  }
  own.opacity = mesh.userData.fitOpacity as number;
  own.transparent = mesh.userData.fitTransparent as boolean;
  own.depthWrite = mesh.userData.fitDepthWrite as boolean;
  mesh.material = own;
  mesh.visible = level >= 1;
}

/** The material a fade is drawing with, or null when the fitting is at either end. */
export function fittingFadeMaterial(mesh: Mesh): Material | null {
  const fade = mesh.userData[FADE];
  return fade instanceof MeshStandardMaterial ? fade : null;
}
