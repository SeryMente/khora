// @l0 L0-002-R · @req UI-01/REQ-1
import { test, expect } from '@playwright/test';
import AppIcon from '../../app/components/os/AppIcon';
import React from 'react';

test.describe('AppIcon Component Contract', () => {
  test('renders correctly with default and custom props', () => {
    const component = AppIcon({
      etiqueta: 'Dictado de Voz',
      icono: 'Mic',
      href: '/sistema/dictado',
      estado: 'normal',
    });

    // Check link/anchor attributes
    expect(component.props.href).toBe('/sistema/dictado');
    expect(component.props['data-testid']).toBe('app-icon');
    expect(component.props['data-estado']).toBe('normal');

    // Check outer styles
    expect(component.props.style?.outlineColor).toBe('var(--khora-accent)');

    // Check inner layout structure (icon div and label span)
    const [iconDiv, labelSpan] = component.props.children;

    expect(iconDiv.type).toBe('div');
    expect(iconDiv.props.style?.backgroundColor).toBe('var(--khora-surface)');
    expect(iconDiv.props.style?.borderColor).toBe('transparent'); // normal/inactive

    expect(labelSpan.type).toBe('span');
    expect(labelSpan.props.children).toBe('Dictado de Voz');
    expect(labelSpan.props.className).toContain('line-clamp-2');
  });

  test('applies highlight border when active or highlighted state', () => {
    const component1 = AppIcon({
      etiqueta: 'Activo por boolean',
      icono: 'Files',
      href: '/route',
      active: true,
    });
    const [iconDiv1] = component1.props.children;
    expect(iconDiv1.props.style?.borderColor).toBe('var(--khora-ink)');
    expect(component1.props['data-estado']).toBe('true');

    const component2 = AppIcon({
      etiqueta: 'Activo por estado string',
      icono: 'Files',
      href: '/route',
      estado: 'active',
    });
    const [iconDiv2] = component2.props.children;
    expect(iconDiv2.props.style?.borderColor).toBe('var(--khora-ink)');
    expect(component2.props['data-estado']).toBe('active');
  });

  test('provides fallback for missing active/estado properties', () => {
    const component = AppIcon({
      etiqueta: 'Fallback State',
      icono: 'Network',
      href: '/route',
    });
    expect(component.props['data-estado']).toBe('normal');
    const [iconDiv] = component.props.children;
    expect(iconDiv.props.style?.borderColor).toBe('transparent');
  });

  test('handles legacy properties correctly', () => {
    const component = AppIcon({
      label: 'Legacy Label',
      icon: 'LockKeyhole',
      href: '/legacy',
      active: true,
    });
    expect(component.props['data-estado']).toBe('true');
    const [, labelSpan] = component.props.children;
    expect(labelSpan.props.children).toBe('Legacy Label');
  });

  test('resolves inline icon components or elements', () => {
    const customIcon = React.createElement('svg', { 'data-testid': 'custom-svg' });
    const component = AppIcon({
      etiqueta: 'Custom Icon',
      icono: customIcon,
      href: '/custom-icon',
    });

    const [iconDiv] = component.props.children;
    // When passed a react element directly, it should render it inside the icon container
    expect(iconDiv.props.children).toBe(customIcon);
  });
});
