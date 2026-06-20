import React from 'react';
import { Typography } from 'antd';

const { Title, Text } = Typography;

export default function EmptyState({ icon: Icon, title, description, style }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '48px 24px',
      textAlign: 'center',
      ...style 
    }}>
      {Icon && (
        <div style={{ 
          width: 64, 
          height: 64, 
          borderRadius: '50%', 
          backgroundColor: '#f8fafc', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: 16,
          color: '#94a3b8'
        }}>
          <Icon size={32} strokeWidth={1.5} />
        </div>
      )}
      <Title level={5} style={{ margin: 0, marginBottom: 8, color: '#0f172a', fontWeight: 600 }}>
        {title}
      </Title>
      {description && (
        <Text type="secondary" style={{ fontSize: 14 }}>
          {description}
        </Text>
      )}
    </div>
  );
}
