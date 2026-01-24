import Image from 'next/image';
import Link from 'next/link';

export function Header() {
    return (
        <header className="w-full bg-white pt-4 pb-2">
            <div className="w-full px-4 flex justify-center">
                <Link href="/" className="relative w-full max-w-5xl h-80 block">
                    <Image
                        src="/logo.svg"
                        alt="Grace Caretakers Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </Link>
            </div>
        </header>
    );
}
