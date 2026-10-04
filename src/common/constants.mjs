export const MODULE_ID = "illusive-combat-hud";
export const MODULE_PATH = `modules/${MODULE_ID}`;

export async function ichLoadTemplates(paths) {
  return foundry.applications.handlebars.loadTemplates(paths);
}

export async function ichRenderTemplate(path, data) {
  return foundry.applications.handlebars.renderTemplate(path, data);
}
