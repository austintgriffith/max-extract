"use client";

export const Chapter2 = () => {
  return (
    <div className="bg-base-300 rounded-3xl p-8 mb-6">
      <h2 className="text-3xl font-bold mb-6 text-primary">Chapter 2: The Announcement</h2>
      <div className="space-y-6">
        {/* TODO Section */}
        <div className="bg-warning/10 border border-warning rounded-lg p-4">
          <p className="text-warning font-semibold">TODO: Graphics and lore content coming soon</p>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none text-base-content">
          <h3 className="text-xl font-semibold mb-4 text-secondary">Overview</h3>
          <p className="mb-4">
            Now that you have your satellite deployed, it&apos;s time to <strong>announce yourself</strong> to the
            sector. Pilots need to know who you are and how to contact you when they want to share their success stories
            or collaborate on future missions.
          </p>

          <h3 className="text-xl font-semibold mb-4 text-secondary">The About Contract</h3>
          <p className="mb-4">
            You need to deploy a simple <strong>About Contract</strong> that contains your canonical information. This
            contract should be immutable once deployed and contain the following fields:
          </p>

          {/* Contract Fields */}
          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <h4 className="font-semibold mb-3 text-accent">Required Constant Fields:</h4>
            <div className="space-y-2 text-sm mb-4">
              <div className="bg-base-200 p-3 rounded font-mono text-xs">
                <div>string public constant name = &ldquo;YourStationName&rdquo;;</div>
                <div>string public constant social = &ldquo;https://twitter.com/yourusername&rdquo;;</div>
              </div>
            </div>
            <div className="space-y-1 text-sm text-base-content/70">
              <div>
                <strong>name:</strong> Your team/station name
              </div>
              <div>
                <strong>social:</strong> Your contact link (Twitter, Telegram, Signal, etc.)
              </div>
            </div>
            <div className="mt-3 p-2 bg-error/10 rounded text-sm text-error">
              Social URLs must start with <code className="bg-base-100 px-1 rounded">https://</code> to be displayed as
              clickable links
            </div>
            <div className="mt-3 p-2 bg-info/10 rounded text-sm text-info">
              These values are hardcoded and cannot be changed after deployment
            </div>
            <div className="mt-2 p-2 bg-warning/10 rounded text-sm text-warning">
              <strong>TODO:</strong> More fields will be added as the game matures
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Registry Integration</h3>
          <p className="mb-4">
            After deploying your About contract, you need to call a function in your Registry contract to register it
            under the <code className="bg-base-100 px-2 py-1 rounded text-sm">&ldquo;about&rdquo;</code> key in your
            modules mapping:
          </p>

          {/* Code Example */}
          <div className="bg-base-100 rounded-lg p-4 mb-4 border">
            <pre className="text-sm overflow-x-auto">
              <code className="text-accent">{`// Call this function on your Registry contract
setModule("about", address(yourAboutContract));`}</code>
            </pre>
          </div>

          <p className="mb-4 text-sm text-base-content/70">
            You&apos;ll need to implement a <code className="bg-base-100 px-2 py-1 rounded text-sm">setModule</code>{" "}
            function (or similar) in your Registry contract that allows you to update the modules mapping with proper
            access control.
          </p>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Why This Matters</h3>
          <div className="bg-info/10 border border-info rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-info text-xl">💡</div>
              <div>
                <h4 className="font-semibold text-info mb-2">Increased Tip Potential</h4>
                <p className="text-sm text-base-content">
                  When pilots successfully haul in big asteroid scores and escape the sector, they tip the sector
                  registry. Having your details properly mapped to the &ldquo;about&rdquo; module{" "}
                  <strong>increases your chances of receiving better tips</strong> from grateful pilots!
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-secondary">Implementation Steps</h3>
          <div className="space-y-3 mb-6">
            <div className="flex items-start space-x-3">
              <div className="bg-primary text-primary-content rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <p>
                Create and deploy your About contract with{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">constant name</code> and{" "}
                <code className="bg-base-100 px-2 py-1 rounded text-sm">constant social</code> fields
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-primary text-primary-content rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <p>
                Call your Registry contract&apos;s function to register the About contract address under the
                &ldquo;about&rdquo; key
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-primary text-primary-content rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <p>
                Verify that pilots can discover your information through your sector registry by checking the{" "}
                <a href="/dashboard" className="link link-primary">
                  dashboard
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
