import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import React, { ChangeEvent } from 'react';
import { UiStore } from 'store/ui';
import { useDropzone } from 'react-dropzone';
import { useStores } from 'store';

const StyledTextArea = styled.textarea`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 2px solid #dde1e5;
  outline: none;
  caret-color: #618aff;
  color: #3c3f41;
  font-family: 'Barlow';
  font-size: 1rem;
  font-style: normal;
  font-weight: 500;
  line-height: 20px;
  width: 100%;
  resize: vertical;
  min-height: 300px;

  ::placeholder {
    color: #b0b7bc;
    font-family: 'Barlow';
    font-size: 15px;
    font-style: normal;
    font-weight: 400;
    line-height: 20px;
  }

  :focus {
    border: 2px solid #82b4ff;
  }
`;

interface TicketTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ui: UiStore;
  'data-testid'?: string;
}

export const TicketTextAreaComp = ({
  value,
  onChange,
  placeholder,
  'data-testid': dataTestId
}: TicketTextAreaProps) => {
  const { main } = useStores();

  const textareaValue = () => {
    const textArea = document.querySelector('textarea');
    return textArea?.value || '';
  };

  const handleFailurePlaceHolder = (placeholder: string) => {
    const failurePlaceholder = `![Upload failed]()\n`;
    const updatedValue = textareaValue().replace(placeholder, failurePlaceholder);

    onChange(updatedValue);
  };

  const uploadImage = async (file: File, placeholder: string) => {
    try {
      const formData = new FormData();

      formData.append('file', file);
      const uploadedFile = await main.uploadFile(formData);
      let image_url = '';
      if (uploadedFile && uploadedFile.ok) {
        image_url = await uploadedFile.json();
      }

      if (image_url) {
        const finalMarkdown = `![image](${image_url})\n`;
        const updatedValue = textareaValue().replace(placeholder, finalMarkdown);

        onChange(updatedValue);
      } else {
        handleFailurePlaceHolder(placeholder);
      }
    } catch (e) {
      console.error('ERROR UPLOADING IMAGE', e);
      handleFailurePlaceHolder(placeholder);
    }
  };

  const handleImageUpload = async (file: File) => {
    const uniqueId = uuidv4();
    const placeholder = `![Uploading ${uniqueId}...]()\n`;

    const textArea = document.querySelector('textarea');

    const cursorPosition = textArea?.selectionStart || textArea?.value.length || value.length;
    const newValue =
      textareaValue().slice(0, cursorPosition) +
      placeholder +
      textareaValue().slice(cursorPosition);
    onChange(newValue);

    try {
      uploadImage(file, placeholder);
    } catch (error) {
      const failurePlaceholder = `![Failed to upload ${uniqueId}...]()\n`;
      const updatedValue = textareaValue().replace(placeholder, failurePlaceholder);
      onChange(updatedValue);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !file.type.startsWith('image/')) return;
    await handleImageUpload(file);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const { items } = e.clipboardData;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageUpload(file);
        }
      }
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': []
    },
    noClick: true,
    noKeyboard: true
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <StyledTextArea
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        data-testid={dataTestId}
      />
    </div>
  );
};
