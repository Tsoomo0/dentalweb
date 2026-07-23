<?php

namespace App\Services;

use Google\Client;
use Google\Service\Meet;
use Google\Service\Meet\Space;

class GoogleMeetService
{
    private Client $client;

    public function __construct()
    {
        $this->client = new Client;
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setAccessType('offline');

        $token = $this->client->fetchAccessTokenWithRefreshToken(config('services.google.refresh_token'));

        if (isset($token['error'])) {
            \Log::error('Google OAuth refresh token-оор access token авахад алдаа гарлаа', $token);
        }
    }

    public function createMeetLink(): ?string
    {
        if (! $this->client->getAccessToken()) {
            \Log::error('Google Meet: access token байхгүй тул хүсэлт явуулахгүй — refresh token хүчингүй/дуусах байж магадгүй.');

            return null;
        }

        try {
            $service = new Meet($this->client);
            $space = new Space;
            $created = $service->spaces->create($space);

            return $created->getMeetingUri();
        } catch (\Exception $e) {
            \Log::error('Google Meet link үүсгэхэд алдаа: '.$e->getMessage());

            return null;
        }
    }
}
