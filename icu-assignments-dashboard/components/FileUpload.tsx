import { FC, ChangeEvent, DragEvent } from 'react';
import { UploadCloudIcon } from './icons';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
}

export const FileUpload: FC<FileUploadProps> = ({ onFilesSelected, isLoading }) => {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const docxFiles = Array.from(e.target.files).filter(file => file.name.endsWith('.docx'));
      if (docxFiles.length > 0) {
        onFilesSelected(docxFiles);
      }
      e.target.value = ''; // Reset input to allow re-uploading the same file(s)
    }
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const docxFiles = Array.from(e.dataTransfer.files).filter(file => file.name.endsWith('.docx'));
      if (docxFiles.length > 0) {
        onFilesSelected(docxFiles);
      }
    }
  };

  return (
    <label
      htmlFor="file-upload"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${isLoading ? 'opacity-50' : ''}`}
    >
      <UploadCloudIcon className="w-5 h-5 mr-2 text-gray-400" />
      <span>Import from .docx</span>
      <input
        id="file-upload"
        name="file-upload"
        type="file"
        className="sr-only"
        accept=".docx"
        onChange={handleFileChange}
        disabled={isLoading}
        multiple
      />
    </label>
  );
};