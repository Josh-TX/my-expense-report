import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import {MatTableModule} from '@angular/material/table';

@Component({
  selector: 'mer-file-drop',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule],
  templateUrl: './file-drop.component.html'
})
export class FileDropComponent {
  @Input() multiple: boolean = false;
  @Output("import") importEmitter = new EventEmitter<File[] >();
  isDragging = false;
  dragCount = 0;

  private timeoutId: any;

  ngOnInit() {
    this.setupFileDrop();
  }

  private setupFileDrop() {
    var dropzone = <HTMLElement>document.getElementById('dropzone');
    var dropzone_input = <HTMLInputElement>document.getElementById('file-import');

    ['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'].forEach(function (event) {
      dropzone.addEventListener(event, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    dropzone.addEventListener('dragover', e => {
      this.isDragging = true;
      this.dragCount = e.dataTransfer!.items.length;
      clearTimeout(this.timeoutId);
    }, false);

    dropzone.addEventListener('dragleave', () => {
      clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => {
        this.isDragging = false;
      }, 50)
    }, false);

    dropzone.addEventListener('drop', e => {
      this.isDragging = false;
      if (e.dataTransfer == null) {
        return;
      }

      var files: File[] = [];
      for(var file of <File[]><any>e.dataTransfer.files){
        files.push(file);
      }
      this.importEmitter.emit(files);

    }, false);

    dropzone.addEventListener('change', e => {
      var files: File[] = []
      for(var file of <File[]>(<any>e.target).files){
        files.push(file);
      }
      this.importEmitter.emit(files);
    });
  }
}