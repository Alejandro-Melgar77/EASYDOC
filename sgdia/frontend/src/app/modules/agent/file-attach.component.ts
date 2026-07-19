import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-attach',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="attach-container">
      <button
        class="icon-btn attach-btn"
        (click)="fileInput.click()"
        title="Adjuntar documento o imagen"
      >
        <span class="material-symbols-outlined">attach_file</span>
      </button>
      <input
        type="file"
        #fileInput
        (change)="onFileSelected($event)"
        style="display: none"
        multiple
      />
    </div>
  `,
  styles: [
    `
      .attach-container {
        display: inline-flex;
      }

      .attach-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        color: var(--text-secondary);
        transition: all 0.2s;

        &:hover {
          background: var(--bg-tertiary);
          color: var(--primary);
          transform: rotate(15deg);
        }
      }
    `,
  ],
})
export class FileAttachComponent {
  @Output() filesAttached = new EventEmitter<File[]>();

  onFileSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    if (files.length > 0) {
      this.filesAttached.emit(files);
      event.target.value = ''; // Reset input
    }
  }
}
