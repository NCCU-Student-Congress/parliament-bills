<template>
  <div
    ref="editor"
    class="description-editor"
    contenteditable="true"
    role="textbox"
    aria-multiline="true"
    @input="syncValue"
    @paste="pastePlainText"
    @drop.prevent
    @beforeinput="preventFormatting"
    @keyup="rememberSelection"
    @mouseup="rememberSelection"
    @focusout="rememberSelection"
  ></div>
</template>

<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue';

  const props = defineProps<{ modelValue: string; maxLength?: number }>();
  const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
  const editor = ref<HTMLElement | null>(null);
  let currentValue = props.modelValue;
  let savedRange: Range | null = null;

  function plainText() {
    return (editor.value?.innerText ?? '').replace(/\r\n?/g, '\n').replace(/\n+/g, '\n');
  }

  function renderValue(value: string) {
    if (!editor.value) return;
    const paragraphs = value.replace(/\r\n?/g, '\n').split(/\n+/);
    editor.value.replaceChildren(
      ...paragraphs.map((text) => {
        const paragraph = document.createElement('p');
        if (text) paragraph.textContent = text;
        else paragraph.append(document.createElement('br'));
        return paragraph;
      }),
    );
    currentValue = value;
  }

  function syncValue() {
    const value = plainText();
    currentValue = value;
    emit('update:modelValue', value);
    rememberSelection();
  }

  function rememberSelection() {
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.value?.contains(selection.anchorNode)) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (!editor.value) return;
    const currentSelection = window.getSelection();
    const currentRange =
      currentSelection?.rangeCount && editor.value.contains(currentSelection.anchorNode)
        ? currentSelection.getRangeAt(0).cloneRange()
        : null;
    const range =
      currentRange ??
      (savedRange && editor.value.contains(savedRange.commonAncestorContainer)
        ? savedRange.cloneRange()
        : document.createRange());
    if (!editor.value.contains(range.commonAncestorContainer)) {
      range.selectNodeContents(editor.value);
      range.collapse(false);
    }
    editor.value.focus();
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function insertTextFallback(value: string) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(value);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function insertText(value: string) {
    if (!editor.value) return;
    restoreSelection();
    const selectedLength = window.getSelection()?.toString().replace(/\n+/g, '\n').length ?? 0;
    if (props.maxLength && plainText().length - selectedLength + value.length > props.maxLength)
      return;

    const lines = value.replace(/\r\n?/g, '\n').split(/\n+/);
    for (const [index, line] of lines.entries()) {
      if (index && !document.execCommand('insertParagraph')) insertTextFallback('\n');
      if (line && !document.execCommand('insertText', false, line)) insertTextFallback(line);
    }
    syncValue();
  }

  function pastePlainText(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain');
    if (text) insertText(text);
  }

  function preventFormatting(event: InputEvent) {
    if (event.inputType === 'insertLineBreak' && document.execCommand('insertParagraph')) {
      event.preventDefault();
      return;
    }
    if (event.inputType.startsWith('format') || event.inputType === 'insertFromDrop') {
      event.preventDefault();
      return;
    }
    if (props.maxLength && event.data && !event.isComposing) {
      const selectedLength = window.getSelection()?.toString().replace(/\n+/g, '\n').length ?? 0;
      if (plainText().length - selectedLength + event.data.length > props.maxLength) {
        event.preventDefault();
      }
    }
  }

  onMounted(() => renderValue(props.modelValue));
  watch(
    () => props.modelValue,
    (value) => {
      if (value !== currentValue) renderValue(value);
    },
  );

  defineExpose({ insertText });
</script>

<style>
  .description-editor {
    min-block-size: 7rem;
    line-height: 1.75;
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }

  .description-editor > :where(p, div) {
    margin: 0;
    min-block-size: 1.75em;
  }

  .description-editor > :where(p, div) + :where(p, div) {
    margin-block-start: 0.75rem;
  }
</style>
