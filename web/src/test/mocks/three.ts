import { vi } from 'vitest'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => children,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    gl: {},
    scene: {},
    camera: {},
    size: { width: 800, height: 600 },
  })),
}))

vi.mock('@react-three/drei', () => ({
  useGLTF: vi.fn(() => ({
    scene: {},
    nodes: {},
    materials: {},
  })),
  OrbitControls: () => null,
  Environment: () => null,
  PresentationControls: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('three', () => ({
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas'),
  })),
  Color: vi.fn(),
  Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0, set: vi.fn() })),
  MeshStandardMaterial: vi.fn(),
}))
