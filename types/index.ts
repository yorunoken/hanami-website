export interface CardProps {
    title: string;
    children: React.ReactNode;
    commands: Array<string>;
    descriptions: Array<string>;
    titleLeft: boolean;
}

export interface CommandProps {
    name: string;
    description: string
}