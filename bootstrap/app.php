<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\DoctorMiddleware;
use App\Http\Middleware\EitherAuthMiddleware;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\HrMiddleware;
use App\Http\Middleware\LabMiddleware;
use App\Http\Middleware\MaintenanceMiddleware;
use App\Http\Middleware\PatientMiddleware;
use App\Http\Middleware\ReceptionMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            MaintenanceMiddleware::class,
        ]);

        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'hr' => HrMiddleware::class,
            'doctor' => DoctorMiddleware::class,
            'reception' => ReceptionMiddleware::class,
            'lab' => LabMiddleware::class,
            'patient' => PatientMiddleware::class,
            'either.auth' => EitherAuthMiddleware::class,
        ]);

        // QPay callback — гадны сервер дуудах тул CSRF-аас чөлөөлөх
        $middleware->validateCsrfTokens(except: [
            'payment/callback/*',
            'patient/leasing/callback/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
