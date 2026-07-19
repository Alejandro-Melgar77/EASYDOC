import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Folder, Document } from '../../core/models/document.model';

interface UploadFileItem {
  file: File;
  name: string;
  size: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content glass-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Cargar Documentos</h2>
          <button class="close-btn" (click)="onClose()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="upload-grid">
          <!-- Zona de Drag and Drop (Lado Izquierdo) -->
          <div class="dropzone-area">
            <div
              class="dropzone"
              [class.dragover]="isDragOver()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              (click)="fileInput.click()"
            >
              <input
                #fileInput
                type="file"
                multiple
                style="display: none"
                (change)="onFileSelected($event)"
              />
              <span class="material-symbols-outlined upload-icon">cloud_upload</span>
              <h3>Arrastra tus archivos aquí</h3>
              <p>o haz clic para explorar tus carpetas</p>
              <span class="file-limits">Soporte para PDF, Word, Excel e Imágenes (máx. 50MB)</span>
            </div>

            <!-- Listado de Archivos Seleccionados -->
            <div class="selected-files-list" *ngIf="files().length > 0">
              <h4>Archivos Seleccionados ({{ files().length }})</h4>
              <div class="file-item" *ngFor="let item of files(); let idx = index">
                <span class="material-symbols-outlined file-icon">{{
                  getFileIcon(item.name)
                }}</span>
                <div class="file-details">
                  <span class="name">{{ item.name }}</span>
                  <span class="size">{{ item.size }}</span>
                  <div
                    class="progress-container"
                    *ngIf="item.status === 'uploading' || item.status === 'success'"
                  >
                    <div class="progress-bar" [style.width.%]="item.progress"></div>
                  </div>
                </div>
                <div class="item-actions">
                  <span class="status-badge" [ngClass]="item.status">
                    {{
                      item.status === 'success'
                        ? 'Completado'
                        : item.status === 'uploading'
                          ? item.progress + '%'
                          : 'Listo'
                    }}
                  </span>
                  <button
                    class="remove-btn"
                    (click)="removeFile(idx)"
                    [disabled]="item.status === 'uploading'"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Metadatos de Carga (Lado Derecho) -->
          <div class="metadata-form-area">
            <form [formGroup]="uploadForm" (ngSubmit)="onSubmit()" class="metadata-form">
              <div class="form-group">
                <label for="title">Título del Documento</label>
                <input
                  id="title"
                  type="text"
                  formControlName="title"
                  placeholder="Ej. Contrato de Adquisiciones 2026"
                  class="form-control"
                  [class.invalid]="isFieldInvalid('title')"
                />
                <span class="error-text" *ngIf="isFieldInvalid('title')"
                  >El título es requerido</span
                >
              </div>

              <div class="form-group">
                <label for="description">Descripción</label>
                <textarea
                  id="description"
                  formControlName="description"
                  placeholder="Detalle o resumen del documento..."
                  class="form-control text-area"
                  rows="3"
                ></textarea>
              </div>

              <div class="form-group">
                <label>Etiquetas / Tags</label>
                <div class="tags-input-container form-control">
                  <span class="tag-badge" *ngFor="let tag of tags()">
                    {{ tag }}
                    <span class="material-symbols-outlined remove-tag" (click)="removeTag(tag)"
                      >close</span
                    >
                  </span>
                  <input
                    type="text"
                    placeholder="Escribe y presiona Enter..."
                    (keydown.enter)="addTag($event)"
                    class="tag-input"
                  />
                </div>
                <!-- Sugerencias de tags -->
                <div class="tag-suggestions">
                  <span
                    *ngFor="let suggestion of tagSuggestions"
                    (click)="selectSuggestedTag(suggestion)"
                    class="suggested-tag"
                  >
                    + {{ suggestion }}
                  </span>
                </div>
              </div>

              <div class="form-group">
                <label>Carpeta de Destino</label>
                <select formControlName="folderId" class="form-control select-control">
                  <option *ngFor="let folder of folders" [value]="folder.id">
                    {{ folder.name }}
                  </option>
                </select>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="onClose()">
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="uploadForm.invalid || files().length === 0 || isUploading()"
                  class="btn btn-primary"
                >
                  <span class="material-symbols-outlined" *ngIf="isUploading()">sync</span>
                  {{ isUploading() ? 'Cargando...' : 'Iniciar Carga' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
      }

      .modal-content {
        width: 900px;
        max-height: 90vh;
        overflow-y: auto;
        padding: 2rem;
        border-radius: var(--border-radius-lg);
        background: var(--bg-card);
        border: var(--glass-border);
        box-shadow: var(--glass-shadow);
        animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        h2 {
          font-size: 1.25rem;
          margin: 0;
        }
      }

      .close-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem;
        border-radius: 50%;
        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      }

      .upload-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      .dropzone-area {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .dropzone {
        border: 2px dashed var(--border-color);
        border-radius: var(--border-radius-lg);
        padding: 3rem 1.5rem;
        text-align: center;
        cursor: pointer;
        transition: var(--transition-normal);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;

        &:hover,
        &.dragover {
          border-color: var(--primary);
          background: var(--primary-glow);
          .upload-icon {
            color: var(--primary);
            transform: translateY(-3px);
          }
        }
      }

      .upload-icon {
        font-size: 3rem;
        color: var(--text-muted);
        transition: transform 0.2s ease;
      }

      .file-limits {
        font-size: 0.7rem;
        color: var(--text-muted);
        margin-top: 0.5rem;
      }

      .selected-files-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-height: 250px;
        overflow-y: auto;

        h4 {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
        }
      }

      .file-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 0.8rem;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
      }

      .file-icon {
        color: var(--primary);
        font-size: 1.5rem;
      }

      .file-details {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 0.2rem;
        overflow: hidden;

        .name {
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .size {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
      }

      .progress-container {
        height: 4px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 2px;
        overflow: hidden;
      }

      .progress-bar {
        height: 100%;
        background: var(--primary);
        transition: width 0.1s ease;
      }

      .item-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .status-badge {
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.05);

        &.success {
          background: rgba(16, 185, 129, 0.15);
          color: var(--success);
        }
        &.uploading {
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
        }
      }

      .remove-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 0.2rem;
        border-radius: 4px;
        &:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }
      }

      .metadata-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;

        label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
      }

      .form-control {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: 0.6rem 0.8rem;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 0.875rem;
        transition: var(--transition-fast);

        &:focus {
          border-color: var(--primary);
          outline: none;
          box-shadow: 0 0 0 2px var(--primary-glow);
        }
        &.invalid {
          border-color: var(--danger);
        }
      }

      .text-area {
        resize: vertical;
      }

      .tags-input-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        align-items: center;
        padding: 0.4rem;
      }

      .tag-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background: var(--primary-glow);
        color: var(--primary);
        border: 1px solid rgba(99, 102, 241, 0.2);
        padding: 0.2rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 4px;

        .remove-tag {
          font-size: 0.9rem;
          cursor: pointer;
          &:hover {
            color: var(--danger);
          }
        }
      }

      .tag-input {
        border: none;
        background: transparent;
        outline: none;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 0.85rem;
        flex: 1;
        min-width: 120px;
      }

      .tag-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-top: 0.25rem;
      }

      .suggested-tag {
        font-size: 0.7rem;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-color);
        color: var(--text-secondary);
        cursor: pointer;
        transition: var(--transition-fast);
        &:hover {
          background: var(--bg-tertiary);
          border-color: var(--text-muted);
          color: var(--text-primary);
        }
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
        border-top: 1px solid var(--border-color);
        padding-top: 1rem;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes scaleUp {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
    `,
  ],
})
export class DocumentUploadComponent {
  private fb = inject(FormBuilder);

  @Input() folders: Folder[] = [];
  @Input() currentFolderId: string | null = null;
  @Output() completed = new EventEmitter<Document[]>();
  @Output() close = new EventEmitter<void>();

  files = signal<UploadFileItem[]>([]);
  tags = signal<string[]>([]);
  isUploading = signal(false);
  isDragOver = signal(false);

  tagSuggestions = ['legal', 'finanzas', 'politica', 'contrato', 'manual', 'rh', 'sga', 'aprobado'];

  uploadForm: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    folderId: ['', [Validators.required]],
  });

  ngOnInit(): void {
    if (this.currentFolderId) {
      this.uploadForm.patchValue({ folderId: this.currentFolderId });
    } else if (this.folders.length > 0) {
      this.uploadForm.patchValue({ folderId: this.folders[0].id });
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.uploadForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files) {
      this.addFilesToList(event.dataTransfer.files);
    }
  }

  onFileSelected(event: any): void {
    if (event.target.files) {
      this.addFilesToList(event.target.files);
    }
  }

  private addFilesToList(fileList: FileList): void {
    const items: UploadFileItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Skip folders or huge files
      if (file.size > 50 * 1024 * 1024) continue;

      items.push({
        file,
        name: file.name,
        size: this.formatBytes(file.size),
        progress: 0,
        status: 'pending',
      });
    }

    this.files.set([...this.files(), ...items]);

    // Auto populate title if it's the first file and title is empty
    if (this.files().length === 1 && !this.uploadForm.value.title) {
      const nameWithoutExt = this.files()[0].name.substring(
        0,
        this.files()[0].name.lastIndexOf('.'),
      );
      this.uploadForm.patchValue({ title: nameWithoutExt });
    }
  }

  removeFile(index: number): void {
    const updated = [...this.files()];
    updated.splice(index, 1);
    this.files.set(updated);
  }

  addTag(event: any): void {
    event.preventDefault();
    const tag = event.target.value.trim().toLowerCase();
    if (tag && !this.tags().includes(tag)) {
      this.tags.set([...this.tags(), tag]);
      event.target.value = '';
    }
  }

  selectSuggestedTag(tag: string): void {
    if (!this.tags().includes(tag)) {
      this.tags.set([...this.tags(), tag]);
    }
  }

  removeTag(tag: string): void {
    this.tags.set(this.tags().filter((t) => t !== tag));
  }

  onSubmit(): void {
    if (this.uploadForm.invalid || this.files().length === 0) return;

    this.isUploading.set(true);

    // Simulate multi-file upload progress
    const totalFiles = this.files().length;
    let completedCount = 0;

    const newDocuments: Document[] = [];

    this.files().forEach((item, index) => {
      item.status = 'uploading';

      const interval = setInterval(() => {
        item.progress += 20;
        if (item.progress >= 100) {
          item.progress = 100;
          item.status = 'success';
          clearInterval(interval);
          completedCount++;

          // Build a simulated Document object
          const ext = item.name.substring(item.name.lastIndexOf('.') + 1).toLowerCase();
          const docType = this.mapExtensionToDocType(ext);

          newDocuments.push({
            id: Math.random().toString(36).substr(2, 9),
            title:
              totalFiles === 1
                ? this.uploadForm.value.title
                : item.name.substring(0, item.name.lastIndexOf('.')),
            description: this.uploadForm.value.description || 'Archivo cargado en lote.',
            type: docType,
            size: item.size,
            folderId: this.uploadForm.value.folderId,
            tags: [...this.tags()],
            author: 'Administrador Sistema', // Mocked currently logged in user
            createdAt: new Date().toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            status: 'active',
            versions: [
              {
                version: '1.0',
                author: 'Administrador Sistema',
                date: new Date().toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
                summary: 'Carga inicial del documento.',
                fileSize: item.size,
              },
            ],
            permissions: [
              { subjectId: 'admin', subjectName: 'Administrador', type: 'role', level: 'admin' },
              { subjectId: 'user', subjectName: 'Usuario', type: 'role', level: 'read' },
            ],
          });

          if (completedCount === totalFiles) {
            setTimeout(() => {
              this.isUploading.set(false);
              this.completed.emit(newDocuments);
            }, 500);
          }
        }
      }, 300);
    });
  }

  onClose(): void {
    this.close.emit();
  }

  // Utilities
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(filename: string): string {
    const ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'xls':
      case 'xlsx':
        return 'table_chart';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'image';
      default:
        return 'draft';
    }
  }

  private mapExtensionToDocType(ext: string): 'pdf' | 'doc' | 'xls' | 'img' {
    switch (ext) {
      case 'pdf':
        return 'pdf';
      case 'xls':
      case 'xlsx':
        return 'xls';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'img';
      default:
        return 'doc';
    }
  }
}
