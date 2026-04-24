<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

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
