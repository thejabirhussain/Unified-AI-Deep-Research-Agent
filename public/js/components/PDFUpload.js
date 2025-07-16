class PDFUpload {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'pdf-upload-container';
    
    this.input = document.createElement('input');
    this.input.type = 'file';
    this.input.accept = '.pdf';
    this.input.id = 'pdfUpload';
    this.input.style.display = 'none';
    
    this.label = document.createElement('label');
    this.label.htmlFor = 'pdfUpload';
    this.label.className = 'pdf-upload-button';
    this.label.innerHTML = '<i class="fas fa-file-pdf"></i> Upload PDF';
    
    this.preview = document.createElement('div');
    this.preview.className = 'pdf-preview';
    
    this.container.appendChild(this.input);
    this.container.appendChild(this.label);
    this.container.appendChild(this.preview);
    
    this.input.addEventListener('change', this.handleFileSelect.bind(this));
  }
  
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.preview.innerHTML = `
        <div class="pdf-preview-card">
          <i class="fas fa-file-pdf"></i>
          <span>${file.name}</span>
          <button class="remove-pdf"><i class="fas fa-times"></i></button>
        </div>
      `;
      
      const removeBtn = this.preview.querySelector('.remove-pdf');
      removeBtn.addEventListener('click', () => {
        this.input.value = '';
        this.preview.innerHTML = '';
      });
    }
  }
  
  getFile() {
    return this.input.files[0];
  }
  
  render() {
    return this.container;
  }
}