import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Embtel Solutions',
    short_name: 'Embtel',
    description: 'Web development, digital marketing, business automation and AI integrations for growing US businesses.',
    start_url: '/',
    display: 'browser',
    background_color: '#09090B',
    theme_color: '#09090B',
    icons: [{ src: '/images/favicon.png', sizes: '256x256', type: 'image/png' }],
  };
}
