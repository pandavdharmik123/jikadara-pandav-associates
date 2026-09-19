import React, { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { Tooltip } from 'antd';

export default function PhotoUploadBox({
  photoUrl,
  onPhotoChange,
  label = 'ફોટો',
  editable = true,
  showRemove = true,
  className = '',
  width = 96,
  height = 120
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (onPhotoChange) onPhotoChange(uploadEvent.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onPhotoChange) onPhotoChange('');
  };

  return (
    <div
      className={`pedhinamu-photo-box ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        border: '1px solid #111',
        backgroundColor: '#fff',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: (editable && onPhotoChange) ? 'pointer' : 'default',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
      onClick={() => (editable && onPhotoChange) && fileInputRef.current?.click()}
    >
      {photoUrl ? (
        <>
          <img
            src={photoUrl}
            alt={label}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          {editable && showRemove && !!onPhotoChange && (
            <Tooltip title="Remove photo">
              <button
                type="button"
                className="photo-remove-btn"
                onClick={handleRemove}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <X size={12} />
              </button>
            </Tooltip>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', color: '#888', padding: 4 }}>
          {editable && <Camera size={18} style={{ marginBottom: 4, opacity: 0.6 }} />}
          <div style={{ fontSize: 11, fontWeight: 500, color: '#333' }}>{label}</div>
        </div>
      )}

      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}
