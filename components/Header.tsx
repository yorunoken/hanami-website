import styles from "styled-components";
import Link from "next/link";

const HeaderContainer = styles.header``;

const linksClass = "text-gray-300 text-2xl px-5 hover:text-white transition-all text-bold";

export default function Header() {
    return (
        <HeaderContainer className="bg-opacity-60 flex justify-center items-center backdrop-blur-md p-4 fixed top-0 left-0 w-full z-50">
            <Link href={"#"} className={linksClass}>
                Home
            </Link>
            <Link href={"#features"} className={linksClass}>
                Features
            </Link>
            <Link href={"#support-me"} className={linksClass}>
                Support me
            </Link>
        </HeaderContainer>
    );
}
