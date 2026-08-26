import { NextRequest, NextResponse } from 'next/server';

const GET = (req: NextRequest) => {
    const random = Math.floor(100000000 + Math.random() * 900000000);
    const url = req.nextUrl.clone();
    url.pathname = `/${random}/contact`;
    url.search = '';

    return NextResponse.redirect(url);
};

export { GET };
