export interface CardProps {
    title: string;
    children: React.ReactNode;
    commands: Array<string>;
}

export interface CommandProps {
    name: string;
}