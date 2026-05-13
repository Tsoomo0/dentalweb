<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        @php $favicon = \App\Models\Setting::get('site_favicon'); @endphp
        @if($favicon)
            <link rel="icon" href="{{ $favicon }}">
            <link rel="shortcut icon" href="{{ $favicon }}">
        @else
            <link rel="icon" type="image/png" href="/favicon.png">
            <link rel="icon" type="image/x-icon" href="/favicon.ico">
            <link rel="shortcut icon" href="/favicon.ico">
        @endif

        {{-- PWA tags --}}
        <link rel="manifest" href="/manifest.webmanifest">
        <meta name="theme-color" content="#dc2626">
        <meta name="application-name" content="Кутикул">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="Кутикул">
        <meta name="mobile-web-app-capable" content="yes">
        <link rel="apple-touch-icon" href="/img/apple-touch-icon-180.png">
        <link rel="apple-touch-icon" sizes="120x120" href="/img/apple-touch-icon-120.png">
        <link rel="apple-touch-icon" sizes="152x152" href="/img/apple-touch-icon-152.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon-180.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
