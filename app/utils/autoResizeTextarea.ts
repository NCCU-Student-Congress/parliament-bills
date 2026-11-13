function resizeTextarea(element: HTMLTextAreaElement) {
  if (CSS.supports('field-sizing', 'content')) return;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

export const vAutoResize = {
  mounted: resizeTextarea,
  updated: resizeTextarea,
};
