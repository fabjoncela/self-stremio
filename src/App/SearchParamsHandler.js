// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useCore } = require('stremio/core');
const { withCoreSuspender, useProfile } = require('stremio/common');

// This private deployment deliberately ignores account, local-storage, and URL
// parameter preferences. It must always use the Tailnet-only streaming server.
const FORCED_STREAMING_SERVER_URL = 'https://fabjon-hp.tail681ec9.ts.net:3010/stremio-server/';

const SearchParamsHandler = () => {
    const core = useCore();
    const profile = useProfile();

    React.useEffect(() => {
        if (profile.settings.streamingServerUrl === FORCED_STREAMING_SERVER_URL) {
            return;
        }
        core.transport.dispatch({
            action: 'Ctx',
            args: {
                action: 'UpdateSettings',
                args: {
                    ...profile.settings,
                    streamingServerUrl: FORCED_STREAMING_SERVER_URL,
                },
            },
        });
    }, [core, profile.settings]);

    return null;
};

module.exports = withCoreSuspender(SearchParamsHandler);
