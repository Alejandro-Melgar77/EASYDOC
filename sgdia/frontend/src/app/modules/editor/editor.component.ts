import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CollaborativeEditorComponent } from './collaborative-editor.component';
import { PolicyDocumentEditorComponent } from './policy-document-editor.component';

@Component({
  selector: 'app-editor-shell',
  standalone: true,
  imports: [CommonModule, CollaborativeEditorComponent, PolicyDocumentEditorComponent],
  template: `
    <app-policy-document-editor *ngIf="documentId() as id; else legacyEditor" [documentId]="id" />
    <ng-template #legacyEditor><app-collaborative-editor /></ng-template>
  `,
})
export class EditorComponent {
  private readonly route = inject(ActivatedRoute);
  readonly documentId = computed(() => this.route.snapshot.queryParamMap.get('documentId'));
}
