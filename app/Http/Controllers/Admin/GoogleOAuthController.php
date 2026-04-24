<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Google\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class GoogleOAuthController extends Controller
{
    private function makeClient(): Client
    {
        $client = new Client();
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setRedirectUri(config('services.google.redirect_uri'));
        $client->setScopes(['https://www.googleapis.com/auth/meetings.space.created']);
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        return $client;
    }

    public function redirect()
    {
        $client = $this->makeClient();
        return redirect($client->createAuthUrl());
    }

    public function callback(Request $request)
    {
        if (!$request->has('code')) {
            return redirect('/admin/dashboard')->with('error', 'Google зөвшөөрөл цуцлагдлаа.');
        }

        $client = $this->makeClient();
        $token  = $client->fetchAccessTokenWithAuthCode($request->code);

        if (!isset($token['refresh_token'])) {
            return redirect('/admin/dashboard')->with('error', 'Refresh token авч чадсангүй. Дахин оролдоно уу.');
        }

        // .env файлд refresh token хадгалах
        $envPath    = base_path('.env');
        $envContent = file_get_contents($envPath);

        if (str_contains($envContent, 'GOOGLE_REFRESH_TOKEN=')) {
            $envContent = preg_replace('/GOOGLE_REFRESH_TOKEN=.*/', 'GOOGLE_REFRESH_TOKEN=' . $token['refresh_token'], $envContent);
        } else {
            $envContent .= "\nGOOGLE_REFRESH_TOKEN=" . $token['refresh_token'];
        }

        file_put_contents($envPath, $envContent);
        Artisan::call('config:clear');

        return redirect('/admin/dashboard')->with('success', 'Google Meet холболт амжилттай хийгдлээ!');
    }
}
