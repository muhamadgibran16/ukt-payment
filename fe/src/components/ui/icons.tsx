import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: '0 0 20 20',
  fill: 'currentColor',
  'aria-hidden': true,
  ...props,
});

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
      clipRule="evenodd"
    />
  </svg>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      fillRule="evenodd"
      d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.83 10l3.94 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z"
      clipRule="evenodd"
    />
  </svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      fillRule="evenodd"
      d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.17 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
      clipRule="evenodd"
    />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      fillRule="evenodd"
      d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z"
      clipRule="evenodd"
    />
  </svg>
);

export const SearchIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      fillRule="evenodd"
      d="M9 3.5a5.5 5.5 0 1 0 3.36 9.86l3.14 3.14a.75.75 0 1 0 1.06-1.06l-3.14-3.14A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
      clipRule="evenodd"
    />
  </svg>
);

export const XIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
  </svg>
);

export const CalendarIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      fillRule="evenodd"
      d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
      clipRule="evenodd"
    />
  </svg>
);

export const UserIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.47 15.15a.97.97 0 0 0 .43 1.16A11.94 11.94 0 0 0 10 18c2.24 0 4.33-.61 6.1-1.69a.97.97 0 0 0 .43-1.16 7.002 7.002 0 0 0-13.06 0Z" />
  </svg>
);

export const LogoutIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      fillRule="evenodd"
      d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .41.34.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M19 10a.75.75 0 0 0-.75-.75H8.7l1.03-.92a.75.75 0 0 0-1-1.12l-2.5 2.25a.75.75 0 0 0 0 1.12l2.5 2.25a.75.75 0 1 0 1-1.12l-1.03-.96h9.55A.75.75 0 0 0 19 10Z"
      clipRule="evenodd"
    />
  </svg>
);

export const MenuIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      fillRule="evenodd"
      d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
      clipRule="evenodd"
    />
  </svg>
);

export const DocumentIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      fillRule="evenodd"
      d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.62a1.5 1.5 0 0 0-.44-1.06l-4.12-4.12A1.5 1.5 0 0 0 11.38 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
      clipRule="evenodd"
    />
  </svg>
);

export const InboxIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      fillRule="evenodd"
      d="M1 11.27c0-.25.03-.5.09-.74l1.48-5.93A2.75 2.75 0 0 1 5.24 2.5h9.52c1.27 0 2.37.86 2.67 2.1l1.48 5.92c.06.25.09.5.09.75v3.98A2.75 2.75 0 0 1 16.25 18H3.75A2.75 2.75 0 0 1 1 15.25v-3.98Zm3.03-6.3a1.25 1.25 0 0 1 1.21-.97h9.52c.58 0 1.08.4 1.21.97l1.33 5.28h-3.01a1.5 1.5 0 0 0-1.34.83l-.33.67a1.5 1.5 0 0 1-1.34.83H8.72a1.5 1.5 0 0 1-1.34-.83l-.33-.67a1.5 1.5 0 0 0-1.34-.83H2.7l1.33-5.28Z"
      clipRule="evenodd"
    />
  </svg>
);
